import { Router, Response } from 'express';
import mongoose from 'mongoose';
import Mission, { MissionStatus, MissionType, IMinedResources } from '../models/Mission';
import PlayerShip, { ShipStatus, IPlayerShip } from '../models/PlayerShip';
import CelestialBody, { ICelestialBody, CelestialBodyType } from '../models/CelestialBody';
import User from '../models/User';
import { IShipTemplate } from '../models/ShipTemplate';
import { AuthRequest, verifyToken } from '../middleware/auth';
import { FACTION_MODIFIERS } from '../config/factions';

const router = Router();

// Wszystkie endpointy wymagają autoryzacji
router.use(verifyToken);

// STAŁE I HELPERY 

// Bazowy czas podróży: 1 AU = 10 minut (można dostosować)
const BASE_TRAVEL_TIME_PER_AU = 10;

// Bazowy czas wydobycia w minutach
const BASE_MINING_TIME = 15;

// Oblicz czas podróży w minutach
const calculateTravelTime = (distance: number, shipSpeed: number, speedModifier: number): number => {
  // Bazowy czas / (prędkość statku * modyfikator frakcji)
  const adjustedSpeed = shipSpeed * speedModifier;
  const travelTime = (distance * BASE_TRAVEL_TIME_PER_AU) / (adjustedSpeed / 5);
  return Math.max(1, Math.round(travelTime));
};

// Oblicz zużycie paliwa
const calculateFuelUsage = (distance: number, fuelConsumption: number): number => {
  // Paliwo na podróż w obie strony
  return Math.ceil(distance * fuelConsumption * 2);
};

// Oblicz czas wydobycia
const calculateMiningTime = (cargoCapacity: number, miningDifficulty: number): number => {
  // Więcej ładowności = dłuższy czas wydobycia
  // Większa trudność = dłuższy czas
  const baseTime = BASE_MINING_TIME + (cargoCapacity / 50);
  return Math.round(baseTime * miningDifficulty);
};

// INTERFEJSY

interface SendMissionBody {
  shipId: string;
  targetId: string;
}

interface MissionResponse {
  _id: string;
  status: MissionStatus;
  type: MissionType;
  ship: {
    _id: string;
    name: string;
    templateName: string;
  };
  target: {
    _id: string;
    name: string;
    type: string;
  };
  times: {
    startTime: Date;
    arrivalTime: Date;
    miningEndTime: Date;
    returnTime: Date;
    travelTimeMinutes: number;
    miningTimeMinutes: number;
    totalTimeMinutes: number;
  };
  fuelUsed: number;
  distance: number;
  progress: number;
  minedResources?: IMinedResources;
  isReadyToCollect: boolean;
}

// ENDPOINTY

// POST /api/missions/send - wyślij statek na misję
router.post('/send', async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { shipId, targetId } = req.body as SendMissionBody;
    const userId = req.user?.userId;
    const userFaction = req.user?.faction;

    // === WALIDACJA DANYCH WEJŚCIOWYCH ===
    if (!shipId || !targetId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Wymagane pola: shipId, targetId'
      });
    }

    // Walidacja ObjectId
    if (!mongoose.Types.ObjectId.isValid(shipId) || !mongoose.Types.ObjectId.isValid(targetId)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowy format ID'
      });
    }

    // POBIERANIE DANYCH

    // Pobierz statek gracza z danymi szablonu
    const ship = await PlayerShip.findOne({
      _id: shipId,
      ownerId: userId
    }).populate('templateId').session(session);

    if (!ship) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Statek nie znaleziony lub nie należy do Ciebie'
      });
    }

    // Pobierz cel misji
    const target = await CelestialBody.findById(targetId).session(session);

    if (!target) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Cel misji nie znaleziony'
      });
    }

    // Pobierz gracza (do sprawdzenia paliwa)
    const user = await User.findById(userId).session(session);

    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie znaleziony'
      });
    }

    // WALIDACJE LOGIKI GRY

    // 1. Czy statek jest wolny?
    if (ship.status !== ShipStatus.IDLE) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Statek jest już zajęty',
        currentStatus: ship.status
      });
    }

    // 2. Czy cel to asteroida? (misje tylko na asteroidy)
    if (!target.isTemporary) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Misje wydobywcze można wysyłać tylko na asteroidy. Planety i księżyce służą do budowy kopalni.',
        targetType: target.type
      });
    }

    // 3. Czy asteroida nie wygasła?
    if (target.expiresAt && target.expiresAt < new Date()) {
      await session.abortTransaction();
      return res.status(410).json({
        success: false,
        message: 'Ta asteroida już nie istnieje (wygasła)'
      });
    }

    // OBLICZENIA MISJI

    const template = ship.templateId as unknown as IShipTemplate;
    const factionMods = userFaction ? FACTION_MODIFIERS[userFaction] : null;
    const speedModifier = factionMods?.shipSpeed ?? 1;

    // Oblicz parametry misji
    const adjustedSpeed = Math.floor(template.speed * speedModifier);
    const travelTimeMinutes = calculateTravelTime(target.distance, adjustedSpeed, speedModifier);
    const miningTimeMinutes = calculateMiningTime(template.cargoCapacity, target.miningDifficulty);
    const fuelNeeded = calculateFuelUsage(target.distance, template.fuelConsumption);

    // 4. Czy gracz ma wystarczająco paliwa?
    if (user.resources.fuel < fuelNeeded) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Niewystarczająca ilość paliwa',
        required: fuelNeeded,
        available: user.resources.fuel
      });
    }

    // 5. Sprawdź czy asteroida nie wygaśnie przed powrotem
    const now = new Date();
    const returnTime = new Date(now.getTime() + (travelTimeMinutes * 2 + miningTimeMinutes) * 60 * 1000);
    
    if (target.expiresAt && target.expiresAt < returnTime) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Asteroida wygaśnie przed zakończeniem misji',
        asteroidExpiresAt: target.expiresAt,
        missionWouldEndAt: returnTime
      });
    }

    // TWORZENIE MISJI

    // Oblicz wszystkie czasy
    const startTime = now;
    const arrivalTime = new Date(now.getTime() + travelTimeMinutes * 60 * 1000);
    const miningEndTime = new Date(arrivalTime.getTime() + miningTimeMinutes * 60 * 1000);
    // returnTime już obliczony wyżej

    // Utwórz misję
    const mission = new Mission({
      ownerId: userId,
      shipId: ship._id,
      targetId: target._id,
      type: MissionType.MINING,
      status: MissionStatus.IN_PROGRESS,
      
      startTime,
      arrivalTime,
      miningEndTime,
      returnTime,
      
      distance: target.distance,
      travelTimeMinutes,
      miningTimeMinutes,
      fuelUsed: fuelNeeded,
      
      shipSnapshot: {
        name: ship.name,
        templateName: template.name,
        cargoCapacity: template.cargoCapacity,
        speed: adjustedSpeed
      },
      targetSnapshot: {
        name: target.name,
        type: target.type,
        isTemporary: target.isTemporary
      }
    });

    await mission.save({ session });

    // AKTUALIZACJA STATKU I ZASOBÓW

    // Oznacz statek jako zajęty
    await PlayerShip.findByIdAndUpdate(
      ship._id,
      {
        status: ShipStatus.ON_MISSION,
        currentMissionId: mission._id
      },
      { session }
    );

    // Odejmij paliwo
    await User.findByIdAndUpdate(
      userId,
      {
        $inc: { 'resources.fuel': -fuelNeeded }
      },
      { session }
    );

    // Zatwierdź transakcję
    await session.commitTransaction();

    // Pobierz zaktualizowane zasoby
    const updatedUser = await User.findById(userId).select('resources');

    // ODPOWIEDŹ

    const totalTimeMinutes = travelTimeMinutes * 2 + miningTimeMinutes;

    res.status(201).json({
      success: true,
      message: `Misja rozpoczęta! ${ship.name} leci do ${target.name}`,
      data: {
        mission: {
          _id: mission._id,
          status: mission.status,
          type: mission.type,
          ship: {
            _id: ship._id,
            name: ship.name,
            templateName: template.name
          },
          target: {
            _id: target._id,
            name: target.name,
            type: target.type
          },
          times: {
            startTime,
            arrivalTime,
            miningEndTime,
            returnTime,
            travelTimeMinutes,
            miningTimeMinutes,
            totalTimeMinutes
          },
          fuelUsed: fuelNeeded,
          distance: target.distance
        },
        newResources: updatedUser?.resources
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Błąd wysyłania misji:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas wysyłania misji'
    });
  } finally {
    session.endSession();
  }
});

// GET /api/missions - pobierz wszystkie misje gracza
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { status, active } = req.query;

    // Buduj filtr
    const filter: any = { ownerId: userId };

    if (status) {
      filter.status = status;
    } else if (active === 'true') {
      // Tylko aktywne misje (nie odebrane)
      filter.status = { $ne: MissionStatus.COLLECTED };
    }

    const missions = await Mission.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    const now = new Date();

    // Formatuj odpowiedź i aktualizuj statusy
    const formattedMissions: MissionResponse[] = missions.map((mission) => {
      // Aktualizuj status na podstawie czasu
      mission.updateStatus();

      const totalTimeMinutes = mission.travelTimeMinutes * 2 + mission.miningTimeMinutes;
      const startMs = mission.startTime.getTime();
      const endMs = mission.returnTime.getTime();
      const nowMs = now.getTime();

      let progress = 0;
      if (nowMs >= endMs) {
        progress = 100;
      } else if (nowMs > startMs) {
        progress = Math.round(((nowMs - startMs) / (endMs - startMs)) * 100);
      }

      return {
        _id: mission._id.toString(),
        status: mission.status,
        type: mission.type,
        ship: {
          _id: mission.shipId.toString(),
          name: mission.shipSnapshot.name,
          templateName: mission.shipSnapshot.templateName
        },
        target: {
          _id: mission.targetId.toString(),
          name: mission.targetSnapshot.name,
          type: mission.targetSnapshot.type
        },
        times: {
          startTime: mission.startTime,
          arrivalTime: mission.arrivalTime,
          miningEndTime: mission.miningEndTime,
          returnTime: mission.returnTime,
          travelTimeMinutes: mission.travelTimeMinutes,
          miningTimeMinutes: mission.miningTimeMinutes,
          totalTimeMinutes
        },
        fuelUsed: mission.fuelUsed,
        distance: mission.distance,
        progress,
        minedResources: mission.minedResources || undefined,
        isReadyToCollect: mission.status === MissionStatus.COMPLETED || 
                          (now >= mission.returnTime && mission.status !== MissionStatus.COLLECTED)
      };
    });

    // Zapisz zaktualizowane statusy
    await Promise.all(
      missions.map(m => m.save())
    );

    // Statystyki
    const stats = {
      total: formattedMissions.length,
      inProgress: formattedMissions.filter(m => m.status === MissionStatus.IN_PROGRESS).length,
      mining: formattedMissions.filter(m => m.status === MissionStatus.MINING).length,
      returning: formattedMissions.filter(m => m.status === MissionStatus.RETURNING).length,
      readyToCollect: formattedMissions.filter(m => m.isReadyToCollect).length
    };

    res.status(200).json({
      success: true,
      data: {
        missions: formattedMissions,
        stats
      }
    });

  } catch (error) {
    console.error('Błąd pobierania misji:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas pobierania misji'
    });
  }
});

// GET /api/missions/:id - szczegóły konkretnej misji
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const missionId = req.params.id;

    const mission = await Mission.findOne({
      _id: missionId,
      ownerId: userId
    });

    if (!mission) {
      return res.status(404).json({
        success: false,
        message: 'Misja nie znaleziona'
      });
    }

    // Aktualizuj status
    mission.updateStatus();
    await mission.save();

    const now = new Date();
    const totalTimeMinutes = mission.travelTimeMinutes * 2 + mission.miningTimeMinutes;

    res.status(200).json({
      success: true,
      data: {
        mission: {
          _id: mission._id,
          status: mission.status,
          type: mission.type,
          ship: {
            _id: mission.shipId,
            name: mission.shipSnapshot.name,
            templateName: mission.shipSnapshot.templateName,
            cargoCapacity: mission.shipSnapshot.cargoCapacity,
            speed: mission.shipSnapshot.speed
          },
          target: {
            _id: mission.targetId,
            name: mission.targetSnapshot.name,
            type: mission.targetSnapshot.type,
            isTemporary: mission.targetSnapshot.isTemporary
          },
          times: {
            startTime: mission.startTime,
            arrivalTime: mission.arrivalTime,
            miningEndTime: mission.miningEndTime,
            returnTime: mission.returnTime,
            travelTimeMinutes: mission.travelTimeMinutes,
            miningTimeMinutes: mission.miningTimeMinutes,
            totalTimeMinutes
          },
          fuelUsed: mission.fuelUsed,
          distance: mission.distance,
          minedResources: mission.minedResources,
          bonusCollected: mission.bonusCollected,
          isReadyToCollect: mission.status === MissionStatus.COMPLETED ||
                            (now >= mission.returnTime && mission.status !== MissionStatus.COLLECTED)
        }
      }
    });

  } catch (error) {
    console.error('Błąd pobierania misji:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera'
    });
  }
});

// OBLICZANIE WYDOBYTYCH ZASOBÓW 

// Oblicz wydobyte zasoby na podstawie parametrów misji
const calculateMinedResources = (
  cargoCapacity: number,
  resourceModifiers: { iron: number; rareMetals: number; crystals: number; fuel: number },
  miningBonus: { iron?: number; rareMetals?: number; crystals?: number; fuel?: number },
  bonusResources?: { iron?: number; rareMetals?: number; crystals?: number; fuel?: number } | null
): IMinedResources => {
  // Bazowa ilość wydobycia = ładowność statku
  // Rozdzielamy ładowność proporcjonalnie do modyfikatorów zasobów
  const totalModifier = resourceModifiers.iron + resourceModifiers.rareMetals + 
                        resourceModifiers.crystals + resourceModifiers.fuel;
  
  // Bazowe ilości (proporcjonalne do modyfikatorów)
  let iron = Math.floor((resourceModifiers.iron / totalModifier) * cargoCapacity * resourceModifiers.iron);
  let rareMetals = Math.floor((resourceModifiers.rareMetals / totalModifier) * cargoCapacity * resourceModifiers.rareMetals);
  let crystals = Math.floor((resourceModifiers.crystals / totalModifier) * cargoCapacity * resourceModifiers.crystals);
  let fuel = Math.floor((resourceModifiers.fuel / totalModifier) * cargoCapacity * resourceModifiers.fuel);
  
  // Zastosuj bonusy frakcji
  if (miningBonus.iron) iron = Math.floor(iron * miningBonus.iron);
  if (miningBonus.rareMetals) rareMetals = Math.floor(rareMetals * miningBonus.rareMetals);
  if (miningBonus.crystals) crystals = Math.floor(crystals * miningBonus.crystals);
  if (miningBonus.fuel) fuel = Math.floor(fuel * miningBonus.fuel);
  
  // Dodaj bonus z asteroidy (jednorazowy)
  if (bonusResources) {
    iron += bonusResources.iron || 0;
    rareMetals += bonusResources.rareMetals || 0;
    crystals += bonusResources.crystals || 0;
    fuel += bonusResources.fuel || 0;
  }
  
  // Dodaj odrobinę losowości (±10%)
  const randomize = (value: number): number => {
    const variance = Math.floor(value * 0.1);
    return Math.max(0, value + Math.floor(Math.random() * (variance * 2 + 1)) - variance);
  };
  
  return {
    iron: randomize(iron),
    rareMetals: randomize(rareMetals),
    crystals: randomize(crystals),
    fuel: randomize(fuel)
  };
};

// POST /api/missions/:id/collect - odbierz zasoby z ukończonej misji
router.post('/:id/collect', async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?.userId;
    const userFaction = req.user?.faction;
    const missionId = req.params.id;

    // Pobierz misję
    const mission = await Mission.findOne({
      _id: missionId,
      ownerId: userId
    }).session(session);

    if (!mission) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Misja nie znaleziona'
      });
    }

    // Aktualizuj status na podstawie czasu
    mission.updateStatus();

    // Sprawdź czy misja jest gotowa do odebrania
    const now = new Date();
    const isReady = mission.status === MissionStatus.COMPLETED || 
                    (now >= mission.returnTime && mission.status !== MissionStatus.COLLECTED);

    if (!isReady) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Misja nie jest jeszcze gotowa do odebrania',
        status: mission.status,
        returnTime: mission.returnTime
      });
    }

    if (mission.status === MissionStatus.COLLECTED) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Zasoby z tej misji zostały już odebrane'
      });
    }

    // Pobierz cel misji (dla modyfikatorów zasobów i bonusu)
    const target = await CelestialBody.findById(mission.targetId).session(session);
    
    // Pobierz modyfikatory frakcji
    const factionMods = userFaction ? FACTION_MODIFIERS[userFaction] : null;
    const miningBonus = factionMods?.miningBonus || {};

    // Oblicz wydobyte zasoby (jeśli jeszcze nie obliczone)
    let minedResources = mission.minedResources;
    
    if (!minedResources) {
      const resourceModifiers = target?.resourceModifiers || {
        iron: 1, rareMetals: 1, crystals: 1, fuel: 1
      };
      
      // Pobierz bonus z asteroidy (jeśli istnieje i nie został zebrany)
      const bonusResources = (!mission.bonusCollected && target?.bonusResources) 
        ? target.bonusResources 
        : null;

      minedResources = calculateMinedResources(
        mission.shipSnapshot.cargoCapacity,
        resourceModifiers as { iron: number; rareMetals: number; crystals: number; fuel: number },
        miningBonus,
        bonusResources as { iron?: number; rareMetals?: number; crystals?: number; fuel?: number } | null
      );

      // Zapisz wydobyte zasoby w misji
      mission.minedResources = minedResources;
      mission.bonusCollected = !!bonusResources;
    }

    // Dodaj zasoby do gracza
    await User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          'resources.iron': minedResources.iron,
          'resources.rareMetals': minedResources.rareMetals,
          'resources.crystals': minedResources.crystals,
          'resources.fuel': minedResources.fuel
        }
      },
      { session }
    );

    // Uwolnij statek
    await PlayerShip.findByIdAndUpdate(
      mission.shipId,
      {
        status: ShipStatus.IDLE,
        currentMissionId: null
      },
      { session }
    );

    // Oznacz misję jako odebraną
    mission.status = MissionStatus.COLLECTED;
    await mission.save({ session });

    // Zatwierdź transakcję
    await session.commitTransaction();

    // Pobierz zaktualizowane zasoby
    const updatedUser = await User.findById(userId).select('resources');

    res.status(200).json({
      success: true,
      message: `Zasoby z misji do ${mission.targetSnapshot.name} zostały odebrane!`,
      data: {
        missionId: mission._id,
        shipName: mission.shipSnapshot.name,
        targetName: mission.targetSnapshot.name,
        minedResources,
        bonusCollected: mission.bonusCollected,
        newResources: updatedUser?.resources
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Błąd odbierania misji:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas odbierania misji'
    });
  } finally {
    session.endSession();
  }
});

// POST /api/missions/collect-all - odbierz zasoby ze wszystkich ukończonych misji
router.post('/collect-all', async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?.userId;
    const userFaction = req.user?.faction;
    const now = new Date();

    // Znajdź wszystkie misje gotowe do odebrania
    const readyMissions = await Mission.find({
      ownerId: userId,
      status: { $ne: MissionStatus.COLLECTED },
      returnTime: { $lte: now }
    }).session(session);

    if (readyMissions.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Brak misji gotowych do odebrania'
      });
    }

    // Pobierz modyfikatory frakcji
    const factionMods = userFaction ? FACTION_MODIFIERS[userFaction] : null;
    const miningBonus = factionMods?.miningBonus || {};

    // Suma wszystkich wydobytych zasobów
    const totalResources: IMinedResources = {
      iron: 0,
      rareMetals: 0,
      crystals: 0,
      fuel: 0
    };

    const collectedMissions: Array<{
      missionId: string;
      shipName: string;
      targetName: string;
      minedResources: IMinedResources;
    }> = [];

    const shipIds: mongoose.Types.ObjectId[] = [];

    // Przetwórz każdą misję
    for (const mission of readyMissions) {
      // Pobierz cel misji
      const target = await CelestialBody.findById(mission.targetId).session(session);
      
      // Oblicz zasoby (jeśli nie obliczone)
      let minedResources = mission.minedResources;
      
      if (!minedResources) {
        const resourceModifiers = target?.resourceModifiers || {
          iron: 1, rareMetals: 1, crystals: 1, fuel: 1
        };
        
        const bonusResources = (!mission.bonusCollected && target?.bonusResources) 
          ? target.bonusResources 
          : null;

        minedResources = calculateMinedResources(
          mission.shipSnapshot.cargoCapacity,
          resourceModifiers as { iron: number; rareMetals: number; crystals: number; fuel: number },
          miningBonus,
          bonusResources as { iron?: number; rareMetals?: number; crystals?: number; fuel?: number } | null
        );

        mission.minedResources = minedResources;
        mission.bonusCollected = !!bonusResources;
      }

      // Dodaj do sumy
      totalResources.iron += minedResources.iron;
      totalResources.rareMetals += minedResources.rareMetals;
      totalResources.crystals += minedResources.crystals;
      totalResources.fuel += minedResources.fuel;

      // Oznacz misję jako odebraną
      mission.status = MissionStatus.COLLECTED;
      await mission.save({ session });

      // Zapisz ID statku do uwolnienia
      shipIds.push(mission.shipId);

      collectedMissions.push({
        missionId: mission._id.toString(),
        shipName: mission.shipSnapshot.name,
        targetName: mission.targetSnapshot.name,
        minedResources
      });
    }

    // Dodaj wszystkie zasoby do gracza
    await User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          'resources.iron': totalResources.iron,
          'resources.rareMetals': totalResources.rareMetals,
          'resources.crystals': totalResources.crystals,
          'resources.fuel': totalResources.fuel
        }
      },
      { session }
    );

    // Uwolnij wszystkie statki
    await PlayerShip.updateMany(
      { _id: { $in: shipIds } },
      {
        status: ShipStatus.IDLE,
        currentMissionId: null
      },
      { session }
    );

    // Zatwierdź transakcję
    await session.commitTransaction();

    // Pobierz zaktualizowane zasoby
    const updatedUser = await User.findById(userId).select('resources');

    res.status(200).json({
      success: true,
      message: `Odebrano zasoby z ${collectedMissions.length} misji!`,
      data: {
        collectedCount: collectedMissions.length,
        totalResources,
        missions: collectedMissions,
        newResources: updatedUser?.resources
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Błąd odbierania wszystkich misji:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas odbierania misji'
    });
  } finally {
    session.endSession();
  }
});

// GET /api/missions/preview/:shipId/:targetId - podgląd misji przed wysłaniem
router.get('/preview/:shipId/:targetId', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userFaction = req.user?.faction;
    const { shipId, targetId } = req.params;

    // Pobierz statek
    const ship = await PlayerShip.findOne({
      _id: shipId,
      ownerId: userId
    }).populate('templateId');

    if (!ship) {
      return res.status(404).json({
        success: false,
        message: 'Statek nie znaleziony'
      });
    }

    // Pobierz cel
    const target = await CelestialBody.findById(targetId);

    if (!target) {
      return res.status(404).json({
        success: false,
        message: 'Cel nie znaleziony'
      });
    }

    // Pobierz zasoby gracza
    const user = await User.findById(userId).select('resources');

    const template = ship.templateId as unknown as IShipTemplate;
    const factionMods = userFaction ? FACTION_MODIFIERS[userFaction] : null;
    const speedModifier = factionMods?.shipSpeed ?? 1;

    // Oblicz parametry
    const adjustedSpeed = Math.floor(template.speed * speedModifier);
    const travelTimeMinutes = calculateTravelTime(target.distance, adjustedSpeed, speedModifier);
    const miningTimeMinutes = calculateMiningTime(template.cargoCapacity, target.miningDifficulty);
    const fuelNeeded = calculateFuelUsage(target.distance, template.fuelConsumption);
    const totalTimeMinutes = travelTimeMinutes * 2 + miningTimeMinutes;

    // Sprawdź warunki
    const canSend = ship.status === ShipStatus.IDLE &&
                    target.isTemporary &&
                    (!target.expiresAt || target.expiresAt > new Date(Date.now() + totalTimeMinutes * 60 * 1000)) &&
                    (user?.resources.fuel || 0) >= fuelNeeded;

    const issues: string[] = [];
    if (ship.status !== ShipStatus.IDLE) issues.push('Statek jest zajęty');
    if (!target.isTemporary) issues.push('Cel nie jest asteroidą');
    if (target.expiresAt && target.expiresAt < new Date(Date.now() + totalTimeMinutes * 60 * 1000)) {
      issues.push('Asteroida wygaśnie przed końcem misji');
    }
    if ((user?.resources.fuel || 0) < fuelNeeded) issues.push('Brak paliwa');

    res.status(200).json({
      success: true,
      data: {
        preview: {
          ship: {
            _id: ship._id,
            name: ship.name,
            status: ship.status,
            template: {
              name: template.name,
              cargoCapacity: template.cargoCapacity,
              speed: adjustedSpeed,
              fuelConsumption: template.fuelConsumption
            }
          },
          target: {
            _id: target._id,
            name: target.name,
            type: target.type,
            distance: target.distance,
            miningDifficulty: target.miningDifficulty,
            resourceModifiers: target.resourceModifiers,
            expiresAt: target.expiresAt
          },
          mission: {
            travelTimeMinutes,
            miningTimeMinutes,
            totalTimeMinutes,
            fuelNeeded,
            playerFuel: user?.resources.fuel || 0
          },
          canSend,
          issues
        }
      }
    });

  } catch (error) {
    console.error('Błąd podglądu misji:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera'
    });
  }
});

export default router;