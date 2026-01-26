import { Router, Response } from 'express';
import mongoose from 'mongoose';
import CelestialBody, { IMine } from '../models/CelestialBody';
import User, { IResources } from '../models/User';
import { AuthRequest, verifyToken } from '../middleware/auth';
import { FACTION_MODIFIERS } from '../config/factions';
import {
  calculateMineCost,
  calculateMineProduction,
  calculateAccumulatedResources,
  MINE_MAX_LEVEL,
  MINE_MAX_ACCUMULATION_HOURS
} from '../config/mines';

const router = Router();

// Wszystkie endpointy wymagają autoryzacji
router.use(verifyToken);

// INTERFEJSY

interface BuildMineBody {
  celestialBodyId: string;
}

interface MineResponse {
  mineId: string;
  celestialBodyId: string;
  celestialBodyName: string;
  level: number;
  lastCollected: Date;
  createdAt: Date;
  productionPerHour: IResources;
  accumulatedResources: IResources;
  hoursAccumulated: number;
  upgradeCost: Omit<IResources, 'fuel'> | null;
  canUpgrade: boolean;
}

// HELPERY

// Formatuj kopalnię do odpowiedzi
const formatMineResponse = (
  mine: IMine,
  celestialBody: any,
  resourceModifiers: { iron: number; rareMetals: number; crystals: number; fuel: number },
  miningBonus: { iron?: number; rareMetals?: number; crystals?: number; fuel?: number },
  buildCostReduction: number
): MineResponse => {
  const productionPerHour = calculateMineProduction(mine.level, resourceModifiers, miningBonus);
  const { resources: accumulatedResources, hoursAccumulated } = calculateAccumulatedResources(
    mine.level,
    mine.lastCollected,
    resourceModifiers,
    miningBonus
  );

  const canUpgrade = mine.level < MINE_MAX_LEVEL;
  const upgradeCost = canUpgrade 
    ? calculateMineCost(mine.level + 1, buildCostReduction) 
    : null;

  return {
    mineId: (mine as any)._id.toString(),
    celestialBodyId: celestialBody._id.toString(),
    celestialBodyName: celestialBody.name,
    level: mine.level,
    lastCollected: mine.lastCollected,
    createdAt: mine.createdAt,
    productionPerHour,
    accumulatedResources,
    hoursAccumulated: Math.round(hoursAccumulated * 100) / 100,
    upgradeCost,
    canUpgrade
  };
};

// ENDPOINTY

// GET /api/mines - pobierz wszystkie kopalnie gracza
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const userFaction = req.user?.faction;

    // Pobierz modyfikatory frakcji
    const factionMods = userFaction ? FACTION_MODIFIERS[userFaction] : null;
    const miningBonus = factionMods?.miningBonus || {};
    const buildCostReduction = factionMods?.buildCostReduction || 1;

    // Znajdź wszystkie ciała niebieskie z kopalniami gracza
    const bodiesWithMines = await CelestialBody.find({
      'mines.ownerId': userId,
      isTemporary: false
    });

    const mines: MineResponse[] = [];
    let totalProductionPerHour: IResources = { iron: 0, rareMetals: 0, crystals: 0, fuel: 0 };
    let totalAccumulated: IResources = { iron: 0, rareMetals: 0, crystals: 0, fuel: 0 };

    for (const body of bodiesWithMines) {
      const playerMine = body.mines.find(m => m.ownerId.toString() === userId);
      
      if (playerMine) {
        const modifiers = body.resourceModifiers as any;
        const mineData = formatMineResponse(
          playerMine,
          body,
          modifiers,
          miningBonus,
          buildCostReduction
        );

        mines.push(mineData);

        // Sumuj produkcję
        totalProductionPerHour.iron += mineData.productionPerHour.iron;
        totalProductionPerHour.rareMetals += mineData.productionPerHour.rareMetals;
        totalProductionPerHour.crystals += mineData.productionPerHour.crystals;
        totalProductionPerHour.fuel += mineData.productionPerHour.fuel;

        // Sumuj zgromadzone zasoby
        totalAccumulated.iron += mineData.accumulatedResources.iron;
        totalAccumulated.rareMetals += mineData.accumulatedResources.rareMetals;
        totalAccumulated.crystals += mineData.accumulatedResources.crystals;
        totalAccumulated.fuel += mineData.accumulatedResources.fuel;
      }
    }

    res.status(200).json({
      success: true,
      data: {
        mines,
        stats: {
          totalMines: mines.length,
          totalProductionPerHour,
          totalAccumulated,
          maxAccumulationHours: MINE_MAX_ACCUMULATION_HOURS
        }
      }
    });

  } catch (error) {
    console.error('Błąd pobierania kopalni:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas pobierania kopalni'
    });
  }
});

// POST /api/mines/build - zbuduj kopalnię na planecie/księżycu
router.post('/build', async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { celestialBodyId } = req.body as BuildMineBody;
    const userId = req.user?.userId;
    const userFaction = req.user?.faction;

    //WALIDACJA DANYCH WEJŚCIOWYCH
    if (!celestialBodyId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Wymagane pole: celestialBodyId'
      });
    }

    if (!mongoose.Types.ObjectId.isValid(celestialBodyId)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowy format ID'
      });
    }

    //POBIERANIE DANYCH

    // Pobierz ciało niebieskie
    const celestialBody = await CelestialBody.findById(celestialBodyId).session(session);

    if (!celestialBody) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Ciało niebieskie nie znalezione'
      });
    }

    // Pobierz gracza
    const user = await User.findById(userId).session(session);

    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie znaleziony'
      });
    }

    //WALIDACJE LOGIKI GRY

    // 1. Czy to nie asteroida? (kopalnie tylko na planetach/księżycach)
    if (celestialBody.isTemporary) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Nie można budować kopalni na asteroidach. Asteroidy służą do jednorazowych misji wydobywczych.'
      });
    }

    // 2. Czy gracz nie ma już kopalni na tym ciele?
    const existingMine = celestialBody.mines.find(
      mine => mine.ownerId.toString() === userId
    );

    if (existingMine) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Masz już kopalnię na tym ciele niebieskim',
        existingMineLevel: existingMine.level
      });
    }

    // 3. Czy jest miejsce na nową kopalnię?
    if (celestialBody.mines.length >= celestialBody.maxMines) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Brak miejsca na nową kopalnię na tym ciele niebieskim',
        currentMines: celestialBody.mines.length,
        maxMines: celestialBody.maxMines
      });
    }

    // OBLICZANIE KOSZTÓW 

    const factionMods = userFaction ? FACTION_MODIFIERS[userFaction] : null;
    const buildCostReduction = factionMods?.buildCostReduction || 1;

    const buildCost = calculateMineCost(1, buildCostReduction);

    // 4. Czy gracz ma wystarczające zasoby?
    if (user.resources.iron < buildCost.iron) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Niewystarczająca ilość żelaza',
        required: buildCost.iron,
        available: user.resources.iron
      });
    }
    if (user.resources.rareMetals < buildCost.rareMetals) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Niewystarczająca ilość rzadkich metali',
        required: buildCost.rareMetals,
        available: user.resources.rareMetals
      });
    }
    if (user.resources.crystals < buildCost.crystals) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Niewystarczająca ilość kryształów',
        required: buildCost.crystals,
        available: user.resources.crystals
      });
    }

    // TWORZENIE KOPALNI 

    const now = new Date();

    const newMine: IMine = {
      ownerId: new mongoose.Types.ObjectId(userId),
      level: 1,
      lastCollected: now,
      createdAt: now
    } as IMine;

    // Dodaj kopalnię do ciała niebieskiego
    celestialBody.mines.push(newMine);
    await celestialBody.save({ session });

    // Odejmij zasoby od gracza
    await User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          'resources.iron': -buildCost.iron,
          'resources.rareMetals': -buildCost.rareMetals,
          'resources.crystals': -buildCost.crystals
        }
      },
      { session }
    );

    // Zatwierdź transakcję
    await session.commitTransaction();

    // Pobierz zaktualizowane dane
    const updatedUser = await User.findById(userId).select('resources');
    const updatedBody = await CelestialBody.findById(celestialBodyId);
    const createdMine = updatedBody?.mines.find(m => m.ownerId.toString() === userId);

    // Oblicz produkcję kopalni
    const modifiers = celestialBody.resourceModifiers as any;
    const miningBonus = factionMods?.miningBonus || {};
    const productionPerHour = calculateMineProduction(1, modifiers, miningBonus);

    res.status(201).json({
      success: true,
      message: `Kopalnia na ${celestialBody.name} została zbudowana!`,
      data: {
        mine: {
          mineId: createdMine ? (createdMine as any)._id.toString() : null,
          celestialBodyId: celestialBody._id,
          celestialBodyName: celestialBody.name,
          level: 1,
          lastCollected: now,
          createdAt: now,
          productionPerHour
        },
        cost: buildCost,
        newResources: updatedUser?.resources
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Błąd budowy kopalni:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas budowy kopalni'
    });
  } finally {
    session.endSession();
  }
});

// POST /api/mines/:celestialBodyId/collect - zbierz zasoby z kopalni
router.post('/:celestialBodyId/collect', async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const celestialBodyId = req.params.celestialBodyId as string;
    const userId = req.user?.userId;
    const userFaction = req.user?.faction;

    if (!mongoose.Types.ObjectId.isValid(celestialBodyId)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowy format ID'
      });
    }

    // Pobierz ciało niebieskie
    const celestialBody = await CelestialBody.findById(celestialBodyId).session(session);

    if (!celestialBody) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Ciało niebieskie nie znalezione'
      });
    }

    // Znajdź kopalnię gracza
    const mineIndex = celestialBody.mines.findIndex(
      mine => mine.ownerId.toString() === userId
    );

    if (mineIndex === -1) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Nie masz kopalni na tym ciele niebieskim'
      });
    }

    const mine = celestialBody.mines[mineIndex];

    // Oblicz zgromadzone zasoby
    const factionMods = userFaction ? FACTION_MODIFIERS[userFaction] : null;
    const miningBonus = factionMods?.miningBonus || {};
    const modifiers = celestialBody.resourceModifiers as any;

    const { resources: collectedResources, hoursAccumulated } = calculateAccumulatedResources(
      mine.level,
      mine.lastCollected,
      modifiers,
      miningBonus
    );

    // Sprawdź czy jest cokolwiek do zebrania
    const totalCollected = collectedResources.iron + collectedResources.rareMetals + 
                          collectedResources.crystals + collectedResources.fuel;

    if (totalCollected === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Brak zasobów do zebrania. Kopalnia dopiero co została opróżniona.',
        lastCollected: mine.lastCollected
      });
    }

    // Zaktualizuj czas ostatniego zbierania
    celestialBody.mines[mineIndex].lastCollected = new Date();
    await celestialBody.save({ session });

    // Dodaj zasoby do gracza
    await User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          'resources.iron': collectedResources.iron,
          'resources.rareMetals': collectedResources.rareMetals,
          'resources.crystals': collectedResources.crystals,
          'resources.fuel': collectedResources.fuel
        }
      },
      { session }
    );

    // Zatwierdź transakcję
    await session.commitTransaction();

    // Pobierz zaktualizowane zasoby
    const updatedUser = await User.findById(userId).select('resources');

    res.status(200).json({
      success: true,
      message: `Zebrano zasoby z kopalni na ${celestialBody.name}!`,
      data: {
        celestialBodyId: celestialBody._id,
        celestialBodyName: celestialBody.name,
        collectedResources,
        hoursAccumulated: Math.round(hoursAccumulated * 100) / 100,
        newResources: updatedUser?.resources
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Błąd zbierania z kopalni:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas zbierania zasobów'
    });
  } finally {
    session.endSession();
  }
});

// POST /api/mines/collect-all - zbierz zasoby ze wszystkich kopalni
router.post('/collect-all', async (req: AuthRequest, res: Response) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const userId = req.user?.userId;
    const userFaction = req.user?.faction;

    const factionMods = userFaction ? FACTION_MODIFIERS[userFaction] : null;
    const miningBonus = factionMods?.miningBonus || {};

    // Znajdź wszystkie ciała niebieskie z kopalniami gracza
    const bodiesWithMines = await CelestialBody.find({
      'mines.ownerId': userId,
      isTemporary: false
    }).session(session);

    if (bodiesWithMines.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Nie masz żadnych kopalni'
      });
    }

    // Suma wszystkich zebranych zasobów
    const totalCollected: IResources = { iron: 0, rareMetals: 0, crystals: 0, fuel: 0 };
    const collectedFromMines: Array<{
      celestialBodyId: string;
      celestialBodyName: string;
      collected: IResources;
      hours: number;
    }> = [];

    // Zbierz z każdej kopalni
    for (const body of bodiesWithMines) {
      const mineIndex = body.mines.findIndex(m => m.ownerId.toString() === userId);
      
      if (mineIndex !== -1) {
        const mine = body.mines[mineIndex];
        const modifiers = body.resourceModifiers as any;

        const { resources: collected, hoursAccumulated } = calculateAccumulatedResources(
          mine.level,
          mine.lastCollected,
          modifiers,
          miningBonus
        );

        // Sprawdź czy jest coś do zebrania
        const total = collected.iron + collected.rareMetals + collected.crystals + collected.fuel;
        
        if (total > 0) {
          // Dodaj do sumy
          totalCollected.iron += collected.iron;
          totalCollected.rareMetals += collected.rareMetals;
          totalCollected.crystals += collected.crystals;
          totalCollected.fuel += collected.fuel;

          // Zaktualizuj czas zbierania
          body.mines[mineIndex].lastCollected = new Date();
          await body.save({ session });

          collectedFromMines.push({
            celestialBodyId: body._id.toString(),
            celestialBodyName: body.name,
            collected,
            hours: Math.round(hoursAccumulated * 100) / 100
          });
        }
      }
    }

    // Sprawdź czy zebrano cokolwiek
    const grandTotal = totalCollected.iron + totalCollected.rareMetals + 
                       totalCollected.crystals + totalCollected.fuel;

    if (grandTotal === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Brak zasobów do zebrania. Wszystkie kopalnie są puste.'
      });
    }

    // Dodaj zasoby do gracza
    await User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          'resources.iron': totalCollected.iron,
          'resources.rareMetals': totalCollected.rareMetals,
          'resources.crystals': totalCollected.crystals,
          'resources.fuel': totalCollected.fuel
        }
      },
      { session }
    );

    // Zatwierdź transakcję
    await session.commitTransaction();

    // Pobierz zaktualizowane zasoby
    const updatedUser = await User.findById(userId).select('resources');

    res.status(200).json({
      success: true,
      message: `Zebrano zasoby z ${collectedFromMines.length} kopalni!`,
      data: {
        totalCollected,
        minesCollected: collectedFromMines.length,
        details: collectedFromMines,
        newResources: updatedUser?.resources
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Błąd zbierania ze wszystkich kopalni:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas zbierania zasobów'
    });
  } finally {
    session.endSession();
  }
});

// GET /api/mines/preview/:celestialBodyId - podgląd przed budową kopalni
router.get('/preview/:celestialBodyId', async (req: AuthRequest, res: Response) => {
  try {
    const celestialBodyId = req.params.celestialBodyId as string;
    const userId = req.user?.userId;
    const userFaction = req.user?.faction;

    if (!mongoose.Types.ObjectId.isValid(celestialBodyId)) {
      return res.status(400).json({
        success: false,
        message: 'Nieprawidłowy format ID'
      });
    }

    // Pobierz ciało niebieskie
    const celestialBody = await CelestialBody.findById(celestialBodyId);

    if (!celestialBody) {
      return res.status(404).json({
        success: false,
        message: 'Ciało niebieskie nie znalezione'
      });
    }

    // Pobierz gracza
    const user = await User.findById(userId).select('resources');

    // Sprawdź warunki
    const factionMods = userFaction ? FACTION_MODIFIERS[userFaction] : null;
    const buildCostReduction = factionMods?.buildCostReduction || 1;
    const miningBonus = factionMods?.miningBonus || {};
    const modifiers = celestialBody.resourceModifiers as any;

    const buildCost = calculateMineCost(1, buildCostReduction);
    const productionPerHour = calculateMineProduction(1, modifiers, miningBonus);

    // Sprawdź problemy
    const issues: string[] = [];
    
    if (celestialBody.isTemporary) {
      issues.push('Asteroidy nie obsługują kopalni');
    }
    
    const existingMine = celestialBody.mines.find(m => m.ownerId.toString() === userId);
    if (existingMine) {
      issues.push('Masz już kopalnię na tym ciele niebieskim');
    }
    
    if (celestialBody.mines.length >= celestialBody.maxMines) {
      issues.push('Brak miejsca na nową kopalnię');
    }
    
    if (user) {
      if (user.resources.iron < buildCost.iron) issues.push('Brak żelaza');
      if (user.resources.rareMetals < buildCost.rareMetals) issues.push('Brak rzadkich metali');
      if (user.resources.crystals < buildCost.crystals) issues.push('Brak kryształów');
    }

    const canBuild = issues.length === 0;

    res.status(200).json({
      success: true,
      data: {
        preview: {
          celestialBody: {
            _id: celestialBody._id,
            name: celestialBody.name,
            type: celestialBody.type,
            resourceModifiers: modifiers,
            currentMines: celestialBody.mines.length,
            maxMines: celestialBody.maxMines
          },
          mine: {
            level: 1,
            buildCost,
            productionPerHour,
            productionPerDay: {
              iron: productionPerHour.iron * 24,
              rareMetals: productionPerHour.rareMetals * 24,
              crystals: productionPerHour.crystals * 24,
              fuel: productionPerHour.fuel * 24
            }
          },
          playerResources: user?.resources,
          canBuild,
          issues
        }
      }
    });

  } catch (error) {
    console.error('Błąd podglądu kopalni:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera'
    });
  }
});

export default router;