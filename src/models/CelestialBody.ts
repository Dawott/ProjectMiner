import mongoose, { Schema, Document, Types } from 'mongoose';

// Typ ciała niebieskiego
export enum CelestialBodyType {
  PLANET = 'planet',
  MOON = 'moon',
  ASTEROID = 'asteroid'
}

// Dostępne surowce na ciele niebieskim
export interface IResourceDeposit {
  iron: number;      // bazowa ilość/modyfikator wydobycia
  rareMetals: number;
  crystals: number;
  fuel: number;
}

// Interfejs kopalni (dla planet/księżyców)
export interface IMine {
  ownerId: Types.ObjectId;
  level: number;
  lastCollected: Date;
  createdAt: Date;
}

// Główny interfejs ciała niebieskiego
export interface ICelestialBody extends Document {
  name: string;
  type: CelestialBodyType;
  description: string;
  distance: number;              // Względna odległość (wpływa na czas podróży)
  resourceModifiers: IResourceDeposit;  // Modyfikatory wydobycia (1.0 = normalne)
  miningDifficulty: number;      // Mnożnik trudności (wpływa na czas/koszt)
  
  // Tylko dla asteroid
  isTemporary: boolean;
  expiresAt?: Date;              // Kiedy asteroida znika
  bonusResources?: Partial<IResourceDeposit>;  // Dodatkowe zasoby (asteroidy)
  
  // Kopalnie (tylko planety/księżyce)
  mines: IMine[];
  maxMines: number;              // Maksymalna liczba kopalni na planecie
  
  // Grafika/UI
  imageUrl?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

// Schema dla kopalni
const MineSchema = new Schema<IMine>({
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  level: {
    type: Number,
    default: 1,
    min: 1,
    max: 5
  },
  lastCollected: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

// Schema dla zasobów
const ResourceDepositSchema = new Schema<IResourceDeposit>({
  iron: { type: Number, default: 1.0 },
  rareMetals: { type: Number, default: 1.0 },
  crystals: { type: Number, default: 1.0 },
  fuel: { type: Number, default: 1.0 }
}, { _id: false });

// Główna schema
const CelestialBodySchema = new Schema<ICelestialBody>({
  name: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: Object.values(CelestialBodyType),
    required: true
  },
  description: {
    type: String,
    required: true
  },
  distance: {
    type: Number,
    required: true,
    min: 0.1
  },
  resourceModifiers: {
    type: ResourceDepositSchema,
    required: true
  },
  miningDifficulty: {
    type: Number,
    default: 1.0,
    min: 0.5,
    max: 3.0
  },
  
  // Asteroidy
  isTemporary: {
    type: Boolean,
    default: false
  },
  expiresAt: {
    type: Date,
    default: null
  },
  bonusResources: {
    type: ResourceDepositSchema,
    default: null
  },
  
  // Kopalnie
  mines: {
    type: [MineSchema],
    default: []
  },
  maxMines: {
    type: Number,
    default: 10
  },
  
  imageUrl: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indeksy
CelestialBodySchema.index({ type: 1 });
CelestialBodySchema.index({ isTemporary: 1, expiresAt: 1 });
CelestialBodySchema.index({ 'mines.ownerId': 1 });

// Wirtualne pole - czy asteroida wygasła
CelestialBodySchema.virtual('isExpired').get(function() {
  if (!this.isTemporary || !this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Metoda statyczna - znajdź aktywne ciała niebieskie
CelestialBodySchema.statics.findActive = function() {
  return this.find({
    $or: [
      { isTemporary: false },
      { isTemporary: true, expiresAt: { $gt: new Date() } }
    ]
  });
};

export default mongoose.model<ICelestialBody>('CelestialBody', CelestialBodySchema);