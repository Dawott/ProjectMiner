import mongoose, { Schema, Document } from 'mongoose';

// Koszt budowy statku
export interface IBuildCost {
  iron: number;
  rareMetals: number;
  crystals: number;
}

// Interfejs szablonu statku
export interface IShipTemplate extends Document {
  name: string;
  description: string;
  cargoCapacity: number;     // pojemność ładunku
  fuelConsumption: number;   // zużycie paliwa na jednostkę odległości
  speed: number;             // prędkość (jednostki odległości/godzinę)
  buildCost: IBuildCost;
  tier: number;              
}

const BuildCostSchema = new Schema<IBuildCost>({
  iron: { type: Number, required: true },
  rareMetals: { type: Number, required: true },
  crystals: { type: Number, required: true }
}, { _id: false });

const ShipTemplateSchema = new Schema<IShipTemplate>({
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  cargoCapacity: {
    type: Number,
    required: true,
    min: 1
  },
  fuelConsumption: {
    type: Number,
    required: true,
    min: 0.1
  },
  speed: {
    type: Number,
    required: true,
    min: 1
  },
  buildCost: {
    type: BuildCostSchema,
    required: true
  },
  tier: {
    type: Number,
    required: true,
    min: 1,
    max: 3,
    default: 1
  }
});

export default mongoose.model<IShipTemplate>('ShipTemplate', ShipTemplateSchema);