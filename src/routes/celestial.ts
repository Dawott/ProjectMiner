import { Router, Response } from 'express';
import CelestialBody, { CelestialBodyType, ICelestialBody } from '../models/CelestialBody';
import { AuthRequest, verifyToken } from '../middleware/auth';
import { cleanupExpiredAsteroids, spawnAsteroids } from '../utils/asteroidGenerator';

const router = Router();

// Wszystkie endpointy wymagają autoryzacji
router.use(verifyToken);

// Interfejs dla odpowiedzi
interface CelestialBodyResponse {
  _id: string;
  name: string;
  type: CelestialBodyType;
  description: string;
  distance: number;
  resourceModifiers: {
    iron: number;
    rareMetals: number;
    crystals: number;
    fuel: number;
  };
  miningDifficulty: number;
  isTemporary: boolean;
  expiresAt?: Date;
  timeUntilExpire?: number;  // w milisekundach
  bonusResources?: {
    iron?: number;
    rareMetals?: number;
    crystals?: number;
    fuel?: number;
  };
  maxMines: number;
  currentMines: number;
  playerMine?: {
    level: number;
    lastCollected: Date;
  };
  canBuildMine: boolean;
  estimatedTravelTime: number;  // w minutach, bazowo
}

// Oblicz szacowany czas podróży (bazowy, bez modyfikatorów statku)
const calculateBaseTravelTime = (distance: number): number => {
  // Bazowo: 1 jednostka odległości = 10 minut
  // Można to później modyfikować przez prędkość statku
  return Math.round(distance * 10);
};

// GET /api/celestial - pobierz wszystkie aktywne ciała niebieskie
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    // Najpierw wyczyść wygasłe asteroidy
    await cleanupExpiredAsteroids();
    
    // Pobierz tylko aktywne ciała niebieskie
    const bodies = await CelestialBody.find({
      $or: [
        { isTemporary: false },
        { isTemporary: true, expiresAt: { $gt: new Date() } }
      ]
    }).sort({ distance: 1 });

    const now = new Date();

    const response: CelestialBodyResponse[] = bodies.map((body) => {
      const modifiers = body.resourceModifiers as any;
      const playerMine = body.mines.find(
        mine => mine.ownerId.toString() === userId
      );

      return {
        _id: body._id.toString(),
        name: body.name,
        type: body.type,
        description: body.description,
        distance: body.distance,
        resourceModifiers: {
          iron: modifiers.iron,
          rareMetals: modifiers.rareMetals,
          crystals: modifiers.crystals,
          fuel: modifiers.fuel
        },
        miningDifficulty: body.miningDifficulty,
        isTemporary: body.isTemporary,
        expiresAt: body.expiresAt || undefined,
        timeUntilExpire: body.expiresAt 
          ? body.expiresAt.getTime() - now.getTime() 
          : undefined,
        bonusResources: body.bonusResources || undefined,
        maxMines: body.maxMines,
        currentMines: body.mines.length,
        playerMine: playerMine ? {
          level: playerMine.level,
          lastCollected: playerMine.lastCollected
        } : undefined,
        canBuildMine: !body.isTemporary && 
                      body.mines.length < body.maxMines && 
                      !playerMine,
        estimatedTravelTime: calculateBaseTravelTime(body.distance)
      };
    });

    // Statystyki
    const stats = {
      totalPlanets: bodies.filter(b => b.type === CelestialBodyType.PLANET).length,
      totalMoons: bodies.filter(b => b.type === CelestialBodyType.MOON).length,
      totalAsteroids: bodies.filter(b => b.isTemporary).length,
      playerMines: bodies.reduce((count, b) => {
        return count + (b.mines.some(m => m.ownerId.toString() === userId) ? 1 : 0);
      }, 0)
    };

    res.status(200).json({
      success: true,
      data: {
        bodies: response,
        stats
      }
    });

  } catch (error) {
    console.error('Błąd pobierania ciał niebieskich:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas pobierania ciał niebieskich'
    });
  }
});

// GET /api/celestial/planets - tylko planety i księżyce (stałe lokacje)
router.get('/planets', async (req: AuthRequest, res: Response) => {
  try {
    const bodies = await CelestialBody.find({ isTemporary: false })
      .sort({ distance: 1 });

    res.status(200).json({
      success: true,
      data: {
        bodies: bodies.map(b => ({
          _id: b._id,
          name: b.name,
          type: b.type,
          description: b.description,
          distance: b.distance,
          resourceModifiers: b.resourceModifiers,
          miningDifficulty: b.miningDifficulty,
          maxMines: b.maxMines,
          currentMines: b.mines.length,
          estimatedTravelTime: calculateBaseTravelTime(b.distance)
        }))
      }
    });

  } catch (error) {
    console.error('Błąd pobierania planet:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas pobierania planet'
    });
  }
});

// GET /api/celestial/asteroids - tylko aktywne asteroidy
router.get('/asteroids', async (req: AuthRequest, res: Response) => {
  try {
    // Wyczyść wygasłe
    const cleaned = await cleanupExpiredAsteroids();
    
    const asteroids = await CelestialBody.find({
      isTemporary: true,
      expiresAt: { $gt: new Date() }
    }).sort({ expiresAt: 1 });

    const now = new Date();

    res.status(200).json({
      success: true,
      data: {
        asteroids: asteroids.map(a => ({
          _id: a._id,
          name: a.name,
          description: a.description,
          distance: a.distance,
          resourceModifiers: a.resourceModifiers,
          miningDifficulty: a.miningDifficulty,
          expiresAt: a.expiresAt,
          timeUntilExpire: a.expiresAt 
            ? a.expiresAt.getTime() - now.getTime() 
            : 0,
          bonusResources: a.bonusResources,
          estimatedTravelTime: calculateBaseTravelTime(a.distance)
        })),
        cleanedExpired: cleaned
      }
    });

  } catch (error) {
    console.error('Błąd pobierania asteroid:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas pobierania asteroid'
    });
  }
});

// GET /api/celestial/:id - szczegóły konkretnego ciała niebieskiego
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const body = await CelestialBody.findById(req.params.id);

    if (!body) {
      return res.status(404).json({
        success: false,
        message: 'Ciało niebieskie nie znalezione'
      });
    }

    // Sprawdź czy asteroida nie wygasła
    if (body.isTemporary && body.expiresAt && body.expiresAt < new Date()) {
      return res.status(410).json({
        success: false,
        message: 'Ta asteroida już nie istnieje (wygasła)'
      });
    }

    const modifiers = body.resourceModifiers as any;
    const playerMine = body.mines.find(
      mine => mine.ownerId.toString() === userId
    );

    res.status(200).json({
      success: true,
      data: {
        body: {
          _id: body._id,
          name: body.name,
          type: body.type,
          description: body.description,
          distance: body.distance,
          resourceModifiers: {
            iron: modifiers.iron,
            rareMetals: modifiers.rareMetals,
            crystals: modifiers.crystals,
            fuel: modifiers.fuel
          },
          miningDifficulty: body.miningDifficulty,
          isTemporary: body.isTemporary,
          expiresAt: body.expiresAt,
          timeUntilExpire: body.expiresAt 
            ? body.expiresAt.getTime() - new Date().getTime() 
            : undefined,
          bonusResources: body.bonusResources,
          maxMines: body.maxMines,
          currentMines: body.mines.length,
          mines: body.mines.map(m => ({
            ownerId: m.ownerId,
            level: m.level,
            isOwn: m.ownerId.toString() === userId
          })),
          playerMine: playerMine ? {
            level: playerMine.level,
            lastCollected: playerMine.lastCollected,
            createdAt: playerMine.createdAt
          } : null,
          canBuildMine: !body.isTemporary && 
                        body.mines.length < body.maxMines && 
                        !playerMine,
          estimatedTravelTime: calculateBaseTravelTime(body.distance)
        }
      }
    });

  } catch (error) {
    console.error('Błąd pobierania ciała niebieskiego:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera'
    });
  }
});

// POST /api/celestial/spawn-asteroids - ręczne generowanie asteroid (do testów/admin)
router.post('/spawn-asteroids', async (req: AuthRequest, res: Response) => {
  try {
    const { count = 3, days = 3 } = req.body;

    // Można dodać sprawdzenie czy user jest adminem
    // Na razie zostawiamy otwarte do testów

    const spawned = await spawnAsteroids(count, days);

    const newAsteroids = await CelestialBody.find({
      isTemporary: true,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 }).limit(spawned);

    res.status(201).json({
      success: true,
      message: `Wygenerowano ${spawned} asteroid`,
      data: {
        asteroids: newAsteroids.map(a => ({
          _id: a._id,
          name: a.name,
          description: a.description,
          distance: a.distance,
          resourceModifiers: a.resourceModifiers,
          expiresAt: a.expiresAt,
          bonusResources: a.bonusResources
        }))
      }
    });

  } catch (error) {
    console.error('Błąd generowania asteroid:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd serwera podczas generowania asteroid'
    });
  }
});

export default router;