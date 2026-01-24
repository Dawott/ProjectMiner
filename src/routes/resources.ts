import { Router, Response } from 'express';
import User, { IResources } from '../models/User';
import { AuthRequest, verifyToken } from '../middleware/auth';
import { FACTION_MODIFIERS } from '../config/factions';

const router = Router();

// Wszystkie endpointy wymagają autoryzacji
router.use(verifyToken);

// GET /api/resources - pobranie zasobów gracza
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.userId).select('resources faction');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie znaleziony'
      });
    }

    // Pobierz modyfikatory frakcji
    const factionMods = FACTION_MODIFIERS[user.faction];

    res.status(200).json({
      success: true,
      data: {
        resources: user.resources,
        faction: user.faction,
        modifiers: {
          miningBonus: factionMods.miningBonus,
          buildCostReduction: factionMods.buildCostReduction
        }
      }
    });

  } catch (error) {
    console.error('Błąd pobierania zasobów:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas pobierania zasobów'
    });
  }
});

// PATCH /api/resources - modyfikacja zasobów (dodawanie/odejmowanie)
interface ResourceUpdateBody {
  operation: 'add' | 'subtract';
  resources: Partial<IResources>;
}

router.patch('/', async (req: AuthRequest, res: Response) => {
  try {
    const { operation, resources } = req.body as ResourceUpdateBody;

    // Walidacja
    if (!operation || !resources) {
      return res.status(400).json({
        success: false,
        message: 'Wymagane pola: operation (add/subtract) i resources'
      });
    }

    if (!['add', 'subtract'].includes(operation)) {
      return res.status(400).json({
        success: false,
        message: 'Operation musi być "add" lub "subtract"'
      });
    }

    // Walidacja wartości zasobów
    const validResources = ['iron', 'rareMetals', 'crystals', 'fuel'];
    for (const [key, value] of Object.entries(resources)) {
      if (!validResources.includes(key)) {
        return res.status(400).json({
          success: false,
          message: `Nieznany zasób: ${key}`,
          validResources
        });
      }
      if (typeof value !== 'number' || value < 0) {
        return res.status(400).json({
          success: false,
          message: `Wartość zasobu ${key} musi być liczbą >= 0`
        });
      }
    }

    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie znaleziony'
      });
    }

    // Sprawdź czy przy odejmowaniu gracz ma wystarczające zasoby
    if (operation === 'subtract') {
      for (const [key, value] of Object.entries(resources)) {
        const resourceKey = key as keyof IResources;
        if (user.resources[resourceKey] < (value as number)) {
          return res.status(400).json({
            success: false,
            message: `Niewystarczające zasoby: ${key}`,
            required: value,
            available: user.resources[resourceKey]
          });
        }
      }
    }

    // Przygotuj update
    const updateFields: Record<string, number> = {};
    for (const [key, value] of Object.entries(resources)) {
      const modifier = operation === 'add' ? 1 : -1;
      updateFields[`resources.${key}`] = modifier * (value as number);
    }

    // Atomowa operacja update
    const updatedUser = await User.findByIdAndUpdate(
      req.user?.userId,
      { $inc: updateFields },
      { new: true }
    ).select('resources');

    res.status(200).json({
      success: true,
      message: `Zasoby ${operation === 'add' ? 'dodane' : 'odjęte'} pomyślnie`,
      data: {
        resources: updatedUser?.resources
      }
    });

  } catch (error) {
    console.error('Błąd modyfikacji zasobów:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas modyfikacji zasobów'
    });
  }
});

// POST /api/resources/collect - zbieranie zasobów (z bonusem frakcji)
interface CollectBody {
  source: string; // np. 'mine', 'mission' - na przyszłość
  resources: Partial<IResources>;
}

router.post('/collect', async (req: AuthRequest, res: Response) => {
  try {
    const { source, resources } = req.body as CollectBody;

    if (!resources || Object.keys(resources).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Wymagane pole: resources'
      });
    }

    const user = await User.findById(req.user?.userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Użytkownik nie znaleziony'
      });
    }

    // Zastosuj modyfikatory frakcji
    const factionMods = FACTION_MODIFIERS[user.faction];
    const collectedResources: Partial<IResources> = {};
    const updateFields: Record<string, number> = {};

    for (const [key, value] of Object.entries(resources)) {
      if (typeof value !== 'number' || value < 0) continue;

      const resourceKey = key as keyof IResources;
      let finalValue = value;

      // Aplikuj bonus wydobycia dla danego zasobu
      const bonusKey = key as keyof typeof factionMods.miningBonus;
      if (factionMods.miningBonus[bonusKey]) {
        finalValue = Math.floor(value * factionMods.miningBonus[bonusKey]!);
      }

      collectedResources[resourceKey] = finalValue;
      updateFields[`resources.${key}`] = finalValue;
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user?.userId,
      { $inc: updateFields },
      { new: true }
    ).select('resources');

    res.status(200).json({
      success: true,
      message: 'Zasoby zebrane pomyślnie',
      data: {
        source: source || 'unknown',
        baseResources: resources,
        collectedResources, // zastosowane bonusy
        factionBonus: factionMods.miningBonus,
        newTotal: updatedUser?.resources
      }
    });

  } catch (error) {
    console.error('Błąd zbierania zasobów:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas zbierania zasobów'
    });
  }
});

export default router;