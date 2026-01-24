import CelestialBody, { CelestialBodyType, IResourceDeposit } from '../models/CelestialBody';
import { 
  ASTEROID_NAME_PREFIXES, 
  ASTEROID_NAME_SUFFIXES, 
  ASTEROID_TYPES 
} from '../seeds/celestialBodies';

// Pomocnicza funkcja - losowa liczba z zakresu
const randomBetween = (min: number, max: number): number => {
  return Math.random() * (max - min) + min;
};

// Pomocnicza funkcja - losowy element z tablicy
const randomFrom = <T>(array: T[]): T => {
  return array[Math.floor(Math.random() * array.length)];
};

// Generowanie unikalnej nazwy asteroidy
const generateAsteroidName = async (): Promise<string> => {
  let attempts = 0;
  const maxAttempts = 50;

  while (attempts < maxAttempts) {
    const prefix = randomFrom(ASTEROID_NAME_PREFIXES);
    const suffix = randomFrom(ASTEROID_NAME_SUFFIXES);
    const number = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
    
    const name = `${prefix}-${number} ${suffix}`;
    
    // Sprawdź czy nazwa jest unikalna
    const existing = await CelestialBody.findOne({ name });
    if (!existing) {
      return name;
    }
    
    attempts++;
  }

  // Fallback - timestamp
  return `AST-${Date.now()}`;
};

// Interfejs dla wygenerowanej asteroidy
export interface GeneratedAsteroid {
  name: string;
  type: CelestialBodyType.ASTEROID;
  description: string;
  distance: number;
  resourceModifiers: IResourceDeposit;
  miningDifficulty: number;
  isTemporary: boolean;
  expiresAt: Date;
  bonusResources: Partial<IResourceDeposit> | null;
  maxMines: number;
}

// Główna funkcja generująca asteroidę
export const generateAsteroid = async (
  daysUntilExpire: number = 3
): Promise<GeneratedAsteroid> => {
  const asteroidType = randomFrom(ASTEROID_TYPES);
  const name = await generateAsteroidName();
  
  // Generuj modyfikatory zasobów
  const resourceModifiers: IResourceDeposit = {
    iron: randomBetween(
      asteroidType.resourceModifiers.iron.min,
      asteroidType.resourceModifiers.iron.max
    ),
    rareMetals: randomBetween(
      asteroidType.resourceModifiers.rareMetals.min,
      asteroidType.resourceModifiers.rareMetals.max
    ),
    crystals: randomBetween(
      asteroidType.resourceModifiers.crystals.min,
      asteroidType.resourceModifiers.crystals.max
    ),
    fuel: randomBetween(
      asteroidType.resourceModifiers.fuel.min,
      asteroidType.resourceModifiers.fuel.max
    )
  };

  // Zaokrąglij do 2 miejsc po przecinku
  Object.keys(resourceModifiers).forEach(key => {
    resourceModifiers[key as keyof IResourceDeposit] = 
      Math.round(resourceModifiers[key as keyof IResourceDeposit] * 100) / 100;
  });

  // Losowa odległość (asteroidy pojawiają się bliżej - łatwiejszy dostęp)
  const distance = randomBetween(1.0, 5.0);

  // Trudność wydobycia
  const miningDifficulty = randomBetween(0.8, 1.5);

  // Data wygaśnięcia
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + daysUntilExpire);

  // Bonus resources (szansa na dodatkowe)
  let bonusResources: Partial<IResourceDeposit> | null = null;
  
  if (Math.random() < asteroidType.bonusChance) {
    // Wybierz losowy zasób do bonusu
    const bonusType = randomFrom(['iron', 'rareMetals', 'crystals', 'fuel'] as const);
    bonusResources = {
      [bonusType]: Math.round(randomBetween(50, 200))  // Jednorazowy bonus
    };
  }

  return {
    name,
    type: CelestialBodyType.ASTEROID,
    description: asteroidType.description,
    distance: Math.round(distance * 10) / 10,
    resourceModifiers,
    miningDifficulty: Math.round(miningDifficulty * 100) / 100,
    isTemporary: true,
    expiresAt,
    bonusResources,
    maxMines: 0  // Asteroidy nie mają kopalni
  };
};

// Generuj wiele asteroid naraz
export const generateMultipleAsteroids = async (
  count: number,
  daysUntilExpire: number = 3
): Promise<GeneratedAsteroid[]> => {
  const asteroids: GeneratedAsteroid[] = [];
  
  for (let i = 0; i < count; i++) {
    const asteroid = await generateAsteroid(daysUntilExpire);
    asteroids.push(asteroid);
  }
  
  return asteroids;
};

// Zapisz wygenerowane asteroidy do bazy
export const spawnAsteroids = async (
  count: number = 3,
  daysUntilExpire: number = 3
): Promise<number> => {
  const asteroids = await generateMultipleAsteroids(count, daysUntilExpire);
  
  const result = await CelestialBody.insertMany(asteroids);
  
  return result.length;
};

// Usuń wygasłe asteroidy
export const cleanupExpiredAsteroids = async (): Promise<number> => {
  const result = await CelestialBody.deleteMany({
    isTemporary: true,
    expiresAt: { $lt: new Date() }
  });
  
  return result.deletedCount;
};

// Pobierz aktywne asteroidy
export const getActiveAsteroids = async () => {
  return CelestialBody.find({
    isTemporary: true,
    expiresAt: { $gt: new Date() }
  }).sort({ expiresAt: 1 });
};