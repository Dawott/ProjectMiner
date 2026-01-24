import mongoose from 'mongoose';
import dotenv from 'dotenv';
import ShipTemplate from '../models/ShipTemplate';
import { SHIP_TEMPLATES_SEED } from './shipTemplates';

dotenv.config();

const seedShipTemplates = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGO_DB;

    if (!mongoURI) {
      throw new Error('MONGO_DB environment variable is not defined');
    }

    await mongoose.connect(mongoURI);
    console.log('Połączono z MongoDB');

    // Sprawdź czy szablony już istnieją
    const existingCount = await ShipTemplate.countDocuments();
    
    if (existingCount > 0) {
      console.log(`Znaleziono ${existingCount} istniejących szablonów.`);
      const answer = process.argv.includes('--force');
      
      if (answer) {
        console.log('Usuwanie istniejących szablonów (--force)...');
        await ShipTemplate.deleteMany({});
      } else {
        console.log('Użyj flagi --force aby nadpisać istniejące szablony.');
        console.log('Zamykanie bez zmian.');
        await mongoose.disconnect();
        return;
      }
    }

    // Wstaw szablony
    const result = await ShipTemplate.insertMany(SHIP_TEMPLATES_SEED);
    console.log(`Dodano ${result.length} szablonów statków:`);
    
    result.forEach((template) => {
      console.log(`  - ${template.name} (Tier ${template.tier})`);
    });

    console.log('\nSeedowanie zakończone pomyślnie!');
    
  } catch (error) {
    console.error('Błąd seedowania:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Rozłączono z MongoDB');
  }
};

seedShipTemplates();
