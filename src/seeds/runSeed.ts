import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ShipTemplate from '../models/ShipTemplate';
import CelestialBody from '../models/CelestialBody';
import { SHIP_TEMPLATES_SEED } from './shipTemplates';
import { PLANETS_SEED } from './celestialBodies';
import { spawnAsteroids } from '../utils/asteroidGenerator';

dotenv.config();

const seedShipTemplates = async (force: boolean): Promise<void> => {
  console.log('\n--- Seedowanie szablonów statków ---');
  
  const existingCount = await ShipTemplate.countDocuments();
  
  if (existingCount > 0) {
    console.log(`Znaleziono ${existingCount} istniejących szablonów.`);
    
    if (force) {
      console.log('Usuwanie istniejących szablonów (--force)...');
      await ShipTemplate.deleteMany({});
    } else {
      console.log('Pomijanie (użyj --force aby nadpisać).');
      return;
    }
  }

  const result = await ShipTemplate.insertMany(SHIP_TEMPLATES_SEED);
  console.log(`Dodano ${result.length} szablonów statków:`);
  
  result.forEach((template) => {
    console.log(`  - ${template.name} (Tier ${template.tier})`);
  });
};

const seedCelestialBodies = async (force: boolean): Promise<void> => {
  console.log('\n--- Seedowanie ciał niebieskich ---');
  
  // Sprawdź istniejące planety (nie asteroidy tymczasowe)
  const existingPlanets = await CelestialBody.countDocuments({ isTemporary: false });
  
  if (existingPlanets > 0) {
    console.log(`Znaleziono ${existingPlanets} istniejących planet/księżyców.`);
    
    if (force) {
      console.log('Usuwanie istniejących stałych ciał niebieskich (--force)...');
      await CelestialBody.deleteMany({ isTemporary: false });
    } else {
      console.log('Pomijanie planet (użyj --force aby nadpisać).');
      return;
    }
  }

  const result = await CelestialBody.insertMany(PLANETS_SEED);
  console.log(`Dodano ${result.length} ciał niebieskich:`);
  
  result.forEach((body) => {
    const modifiers = body.resourceModifiers as any;
    const resources = Object.entries(modifiers)
      .filter(([_, val]) => (val as number) > 1)
      .map(([key, val]) => `${key}: x${val}`)
      .join(', ');
    
    console.log(`  - ${body.name} (${body.type}) - odległość: ${body.distance}, bonusy: ${resources || 'brak'}`);
  });
};

const seedAsteroids = async (count: number = 3): Promise<void> => {
  console.log('\n--- Generowanie asteroid ---');
  
  // Wyczyść wygasłe asteroidy
  const expiredCount = await CelestialBody.countDocuments({
    isTemporary: true,
    expiresAt: { $lt: new Date() }
  });
  
  if (expiredCount > 0) {
    await CelestialBody.deleteMany({
      isTemporary: true,
      expiresAt: { $lt: new Date() }
    });
    console.log(`Usunięto ${expiredCount} wygasłych asteroid.`);
  }
  
  // Sprawdź ile jest aktywnych asteroid
  const activeAsteroids = await CelestialBody.countDocuments({
    isTemporary: true,
    expiresAt: { $gt: new Date() }
  });
  
  console.log(`Aktywne asteroidy: ${activeAsteroids}`);
  
  // Generuj nowe jeśli mało
  if (activeAsteroids < count) {
    const toGenerate = count - activeAsteroids;
    const generated = await spawnAsteroids(toGenerate, 3);
    console.log(`Wygenerowano ${generated} nowych asteroid (wygasną za 3 dni).`);
    
    // Pokaż wygenerowane
    const newAsteroids = await CelestialBody.find({
      isTemporary: true,
      expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 }).limit(generated);
    
    newAsteroids.forEach((ast) => {
      const modifiers = ast.resourceModifiers as any;
      const topResource = Object.entries(modifiers)
        .sort(([, a], [, b]) => (b as number) - (a as number))[0];
      
      console.log(`  - ${ast.name} (główny zasób: ${topResource[0]} x${topResource[1]}, wygasa: ${ast.expiresAt?.toLocaleDateString()})`);
    });
  } else {
    console.log(`Wystarczająca liczba asteroid (${activeAsteroids}/${count}).`);
  }
};

const runSeed = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGO_DB;

    if (!mongoURI) {
      throw new Error('MONGO_DB environment variable is not defined');
    }

    await mongoose.connect(mongoURI);
    console.log('Połączono z MongoDB');

    const force = process.argv.includes('--force');
    const onlyAsteroids = process.argv.includes('--asteroids');
    const asteroidCount = parseInt(process.argv.find(arg => arg.startsWith('--count='))?.split('=')[1] || '3');

    if (onlyAsteroids) {
      // Tylko asteroidy
      await seedAsteroids(asteroidCount);
    } else {
      // Pełne seedowanie
      await seedShipTemplates(force);
      await seedCelestialBodies(force);
      await seedAsteroids(asteroidCount);
    }

    console.log('\nSeedowanie zakończone pomyślnie!');
    
  } catch (error) {
    console.error('Błąd seedowania:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Rozłączono z MongoDB');
  }
};

// Wyświetl pomoc
if (process.argv.includes('--help')) {
  console.log(`
Użycie: npm run seed [opcje]

Opcje:
  --force       Nadpisz istniejące dane (statki, planety)
  --asteroids   Tylko generuj/odśwież asteroidy
  --count=N     Liczba asteroid do utrzymania (domyślnie 3)
  --help        Wyświetl tę pomoc

Przykłady:
  npm run seed                    # Pierwsze seedowanie
  npm run seed -- --force         # Nadpisz wszystko
  npm run seed -- --asteroids     # Tylko asteroidy
  npm run seed -- --asteroids --count=5  # 5 asteroid
`);
} else {
  runSeed();
}