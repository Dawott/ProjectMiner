import { Router, Response } from 'express';
import ShipTemplate, { IBuildCost, IShipTemplate } from '../models/ShipTemplate';
import { AuthRequest, verifyToken } from '../middleware/auth';
import { FACTION_MODIFIERS } from '../config/factions';
import User from '../models/User';
import PlayerShip, { ShipStatus } from '../models/PlayerShip';
import mongoose from 'mongoose';

const router = Router();

router.use(verifyToken);

// Interfejs dla szablonu z przeliczonymi kosztami
interface ShipTemplateWithCosts {
  _id: string;
  name: string;
  description: string;
  cargoCapacity: number;
  fuelConsumption: number;
  speed: number;
  tier: number;
  baseBuildCost: IBuildCost;
  adjustedBuildCost: IBuildCost;
  costReduction: number;
}

interface BuildShipBody {
  templateId: string;
  shipName?: string;
}

// Oblicz koszty z uwzględnieniem redukcji frakcji
const calculateAdjustedCost = (baseCost: IBuildCost, costReduction: number): IBuildCost => {
  return {
    iron: Math.floor(baseCost.iron * costReduction),
    rareMetals: Math.floor(baseCost.rareMetals * costReduction),
    crystals: Math.floor(baseCost.crystals * costReduction)
  };
};

// GET /api/ships/templates - pobierz wszystkie szablony statków
router.get('/templates', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const templates = await ShipTemplate.find().sort({ tier: 1, name: 1 });

    if (!templates || templates.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Brak szablonów statków w bazie. Uruchom seed.'
      });
    }

    // Pobierz modyfikator kosztów budowy dla frakcji gracza
    const faction = req.user?.faction;
    const factionMods = faction ? FACTION_MODIFIERS[faction] : null;
    const costReduction = factionMods?.buildCostReduction ?? 1;

    // Przelicz koszty budowy z uwzględnieniem bonusu frakcji
    const templatesWithAdjustedCosts: ShipTemplateWithCosts[] = templates.map((template) => ({
      _id: template._id.toString(),
      name: template.name,
      description: template.description,
      cargoCapacity: template.cargoCapacity,
      fuelConsumption: template.fuelConsumption,
      speed: template.speed,
      tier: template.tier,
      baseBuildCost: template.buildCost,
      adjustedBuildCost: calculateAdjustedCost(template.buildCost, costReduction),
      costReduction
    }));

    res.status(200).json({
      success: true,
      data: {
        templates: templatesWithAdjustedCosts,
        faction,
        costReductionPercent: costReduction < 1 ? Math.round((1 - costReduction) * 100) : 0
      }
    });

  } catch (error) {
    console.error('Błąd pobierania szablonów:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas pobierania szablonów statków'
    });
  }
});


// GET /api/ships/templates/:id - pobierz konkretny szablon
router.get('/templates/:id', verifyToken, async (req: AuthRequest, res: Response) => {
  try {
    const template = await ShipTemplate.findById(req.params.id);

    if (!template) {
      return res.status(404).json({
        success: false,
        message: 'Szablon statku nie znaleziony'
      });
    }

    // Przelicz koszty
    const faction = req.user?.faction;
    const factionMods = faction ? FACTION_MODIFIERS[faction] : null;
    const costReduction = factionMods?.buildCostReduction ?? 1;


    res.status(200).json({
      success: true,
      data: {
        template: {
          _id: template._id,
          name: template.name,
          description: template.description,
          cargoCapacity: template.cargoCapacity,
          fuelConsumption: template.fuelConsumption,
          speed: template.speed,
          tier: template.tier,
          baseBuildCost: template.buildCost,
          adjustedBuildCost: calculateAdjustedCost(template.buildCost, costReduction),
          costReduction
        }
      }
    });

  } catch (error) {
    console.error('Błąd pobierania szablonu:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas pobierania szablonu'
    });
  }
});

// POST /api/ships/build - zbuduj nowy statek
router.post('/build', async (req: AuthRequest, res: Response) => {
  // Rozpocznij sesję MongoDB dla transakcji
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { templateId, shipName } = req.body as BuildShipBody;
    const userId = req.user?.userId;

    // Walidacja danych wejściowych
    if (!templateId) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Wymagane pole: templateId'
      });
    }

    // Pobierz szablon statku
    const template = await ShipTemplate.findById(templateId).session(session);
    if (!template) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: 'Szablon statku nie znaleziony'
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

    // Oblicz koszt z uwzględnieniem bonusu frakcji
    const factionMods = FACTION_MODIFIERS[user.faction];
    const costReduction = factionMods?.buildCostReduction ?? 1;
    const adjustedCost = calculateAdjustedCost(template.buildCost, costReduction);

    // Sprawdź czy gracz ma wystarczające zasoby
    if (user.resources.iron < adjustedCost.iron) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Niewystarczająca ilość żelaza',
        required: adjustedCost.iron,
        available: user.resources.iron
      });
    }
    if (user.resources.rareMetals < adjustedCost.rareMetals) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Niewystarczająca ilość rzadkich metali',
        required: adjustedCost.rareMetals,
        available: user.resources.rareMetals
      });
    }
    if (user.resources.crystals < adjustedCost.crystals) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Niewystarczająca ilość kryształów',
        required: adjustedCost.crystals,
        available: user.resources.crystals
      });
    }

    // Generuj nazwę statku jeśli nie podano
    const playerShipsCount = await PlayerShip.countDocuments({ ownerId: userId }).session(session);
    const finalShipName = shipName?.trim() || `${template.name} #${playerShipsCount + 1}`;

    // Walidacja nazwy
    if (finalShipName.length < 1 || finalShipName.length > 30) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: 'Nazwa statku musi mieć od 1 do 30 znaków'
      });
    }

    // Odejmij zasoby (atomowa operacja)
    await User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          'resources.iron': -adjustedCost.iron,
          'resources.rareMetals': -adjustedCost.rareMetals,
          'resources.crystals': -adjustedCost.crystals
        }
      },
      { session }
    );

    // Utwórz nowy statek
    const newShip = new PlayerShip({
      ownerId: userId,
      templateId: template._id,
      name: finalShipName,
      status: ShipStatus.IDLE
    });

    await newShip.save({ session });

    // Zatwierdź transakcję
    await session.commitTransaction();

    // Pobierz zaktualizowane zasoby
    const updatedUser = await User.findById(userId).select('resources');

    res.status(201).json({
      success: true,
      message: `Statek "${finalShipName}" został zbudowany!`,
      data: {
        ship: {
          _id: newShip._id,
          name: newShip.name,
          templateName: template.name,
          status: newShip.status,
          createdAt: newShip.createdAt
        },
        cost: adjustedCost,
        newResources: updatedUser?.resources
      }
    });

  } catch (error) {
    await session.abortTransaction();
    console.error('Błąd budowy statku:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas budowy statku'
    });
  } finally {
    session.endSession();
  }
});

// GET /api/ships/fleet - pobierz wszystkie statki gracza
router.get('/fleet', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;

    // Pobierz statki gracza z danymi szablonu
    const ships = await PlayerShip.find({ ownerId: userId })
      .populate('templateId')
      .sort({ createdAt: -1 });

    // Pobierz modyfikator prędkości frakcji
    const faction = req.user?.faction;
    const factionMods = faction ? FACTION_MODIFIERS[faction] : null;
    const speedModifier = factionMods?.shipSpeed ?? 1;

    // Formatuj odpowiedź
    const fleet = ships.map((ship) => {
      const template = ship.templateId as unknown as IShipTemplate;
      
      return {
        _id: ship._id,
        name: ship.name,
        status: ship.status,
        currentMissionId: ship.currentMissionId,
        createdAt: ship.createdAt,
        template: {
          _id: template._id,
          name: template.name,
          description: template.description,
          cargoCapacity: template.cargoCapacity,
          fuelConsumption: template.fuelConsumption,
          baseSpeed: template.speed,
          adjustedSpeed: Math.floor(template.speed * speedModifier),
          tier: template.tier
        }
      };
    });

    // Statystyki floty
    const stats = {
      totalShips: ships.length,
      idleShips: ships.filter(s => s.status === ShipStatus.IDLE).length,
      onMissionShips: ships.filter(s => s.status === ShipStatus.ON_MISSION).length,
      totalCargoCapacity: fleet.reduce((sum, ship) => sum + ship.template.cargoCapacity, 0)
    };

    res.status(200).json({
      success: true,
      data: {
        fleet,
        stats,
        speedModifier,
        speedBonusPercent: speedModifier !== 1 ? Math.round((speedModifier - 1) * 100) : 0
      }
    });

  } catch (error) {
    console.error('Błąd pobierania floty:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas pobierania floty'
    });
  }
});

// GET /api/ships/fleet/:id - pobierz konkretny statek gracza
router.get('/fleet/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const shipId = req.params.id;

    const ship = await PlayerShip.findOne({ 
      _id: shipId, 
      ownerId: userId 
    }).populate('templateId');

    if (!ship) {
      return res.status(404).json({
        success: false,
        message: 'Statek nie znaleziony lub nie należy do Ciebie'
      });
    }

    const template = ship.templateId as unknown as IShipTemplate;
    const faction = req.user?.faction;
    const factionMods = faction ? FACTION_MODIFIERS[faction] : null;
    const speedModifier = factionMods?.shipSpeed ?? 1;

    res.status(200).json({
      success: true,
      data: {
        ship: {
          _id: ship._id,
          name: ship.name,
          status: ship.status,
          currentMissionId: ship.currentMissionId,
          createdAt: ship.createdAt,
          updatedAt: ship.updatedAt,
          template: {
            _id: template._id,
            name: template.name,
            description: template.description,
            cargoCapacity: template.cargoCapacity,
            fuelConsumption: template.fuelConsumption,
            baseSpeed: template.speed,
            adjustedSpeed: Math.floor(template.speed * speedModifier),
            tier: template.tier
          }
        }
      }
    });

  } catch (error) {
    console.error('Błąd pobierania statku:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas pobierania statku'
    });
  }
});

// DELETE /api/ships/fleet/:id - usuń statek (sprzedaj na złom)
router.delete('/fleet/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const shipId = req.params.id;

    const ship = await PlayerShip.findOne({ 
      _id: shipId, 
      ownerId: userId 
    }).populate('templateId');

    if (!ship) {
      return res.status(404).json({
        success: false,
        message: 'Statek nie znaleziony lub nie należy do Ciebie'
      });
    }

    // Nie można usunąć statku na misji
    if (ship.status === ShipStatus.ON_MISSION) {
      return res.status(400).json({
        success: false,
        message: 'Nie można usunąć statku, który jest na misji'
      });
    }

    const template = ship.templateId as unknown as IShipTemplate;

    // Zwrot 50% zasobów
    const refund = {
      iron: Math.floor(template.buildCost.iron * 0.5),
      rareMetals: Math.floor(template.buildCost.rareMetals * 0.5),
      crystals: Math.floor(template.buildCost.crystals * 0.5)
    };

    // Usuń statek i dodaj zwrot zasobów
    await PlayerShip.findByIdAndDelete(shipId);
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      {
        $inc: {
          'resources.iron': refund.iron,
          'resources.rareMetals': refund.rareMetals,
          'resources.crystals': refund.crystals
        }
      },
      { new: true }
    ).select('resources');

    res.status(200).json({
      success: true,
      message: `Statek "${ship.name}" został zezłomowany`,
      data: {
        refund,
        newResources: updatedUser?.resources
      }
    });

  } catch (error) {
    console.error('Błąd usuwania statku:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas usuwania statku'
    });
  }
});

export default router;