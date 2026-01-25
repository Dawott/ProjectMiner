import mongoose, { Schema, Document, Types } from 'mongoose';

// Status misji
export enum MissionStatus {
  IN_PROGRESS = 'in_progress',   // Statek w drodze do celu
  MINING = 'mining',             // Wydobycie w toku
  RETURNING = 'returning',       // Statek wraca
  COMPLETED = 'completed',       // Misja zakończona (do odebrania)
  COLLECTED = 'collected'        // Zasoby odebrane
}

// Typ misji
export enum MissionType {
  MINING = 'mining',             // Standardowa misja wydobywcza
  EXPLORATION = 'exploration'    // Eksploracja (na przyszłość)
}

// Wydobyte zasoby
export interface IMinedResources {
  iron: number;
  rareMetals: number;
  crystals: number;
  fuel: number;
}

// Główny interfejs misji (tylko dane)
export interface IMission {
  ownerId: Types.ObjectId;           // Właściciel misji (gracz)
  shipId: Types.ObjectId;            // Statek wysłany na misję
  targetId: Types.ObjectId;          // Cel misji (ciało niebieskie)

  type: MissionType;
  status: MissionStatus;

  // Czasy misji
  startTime: Date;                   // Kiedy misja się rozpoczęła
  arrivalTime: Date;                 // Kiedy statek dotrze do celu
  miningEndTime: Date;               // Kiedy wydobycie się zakończy
  returnTime: Date;                  // Kiedy statek wróci (end_time)

  // Parametry misji
  distance: number;                  // Odległość do celu
  travelTimeMinutes: number;         // Czas podróży w minutach (w jedną stronę)
  miningTimeMinutes: number;         // Czas wydobycia w minutach
  fuelUsed: number;                  // Zużyte paliwo

  // Wyniki misji (wypełniane po zakończeniu wydobycia)
  minedResources?: IMinedResources;
  bonusCollected: boolean;           // Czy bonus z asteroidy został zebrany

  // Dane snapshotu
  shipSnapshot: {
    name: string;
    templateName: string;
    cargoCapacity: number;
    speed: number;
  };
  targetSnapshot: {
    name: string;
    type: string;
    isTemporary: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
}

// Interface dla metod instancji
export interface IMissionMethods {
  updateStatus(): MissionStatus;
}

// Połączony typ dokumentu z metodami
export type MissionDocument = Document<unknown, {}, IMission> & IMission & IMissionMethods;

// Schema dla wydobytych zasobów
const MinedResourcesSchema = new Schema<IMinedResources>({
  iron: { type: Number, default: 0 },
  rareMetals: { type: Number, default: 0 },
  crystals: { type: Number, default: 0 },
  fuel: { type: Number, default: 0 }
}, { _id: false });

// Schema dla snapshotu statku
const ShipSnapshotSchema = new Schema({
  name: { type: String, required: true },
  templateName: { type: String, required: true },
  cargoCapacity: { type: Number, required: true },
  speed: { type: Number, required: true }
}, { _id: false });

// Schema dla snapshotu celu
const TargetSnapshotSchema = new Schema({
  name: { type: String, required: true },
  type: { type: String, required: true },
  isTemporary: { type: Boolean, required: true }
}, { _id: false });

// Główna schema misji
const MissionSchema = new Schema<IMission, mongoose.Model<IMission, {}, IMissionMethods>, IMissionMethods>({
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  shipId: {
    type: Schema.Types.ObjectId,
    ref: 'PlayerShip',
    required: true
  },
  targetId: {
    type: Schema.Types.ObjectId,
    ref: 'CelestialBody',
    required: true
  },
  
  type: {
    type: String,
    enum: Object.values(MissionType),
    default: MissionType.MINING
  },
  status: {
    type: String,
    enum: Object.values(MissionStatus),
    default: MissionStatus.IN_PROGRESS
  },
  
  // Czasy
  startTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  arrivalTime: {
    type: Date,
    required: true
  },
  miningEndTime: {
    type: Date,
    required: true
  },
  returnTime: {
    type: Date,
    required: true
  },
  
  // Parametry
  distance: {
    type: Number,
    required: true
  },
  travelTimeMinutes: {
    type: Number,
    required: true
  },
  miningTimeMinutes: {
    type: Number,
    required: true
  },
  fuelUsed: {
    type: Number,
    required: true
  },
  
  // Wyniki
  minedResources: {
    type: MinedResourcesSchema,
    default: null
  },
  bonusCollected: {
    type: Boolean,
    default: false
  },
  
  // Snapshoty
  shipSnapshot: {
    type: ShipSnapshotSchema,
    required: true
  },
  targetSnapshot: {
    type: TargetSnapshotSchema,
    required: true
  }
}, {
  timestamps: true
});

// Indeksy dla wydajnych zapytań
MissionSchema.index({ ownerId: 1, status: 1 });
MissionSchema.index({ shipId: 1, status: 1 });
MissionSchema.index({ returnTime: 1, status: 1 });

// Wirtualne pole - czy misja jest gotowa do odebrania
MissionSchema.virtual('isReadyToCollect').get(function() {
  return this.status === MissionStatus.COMPLETED || 
         (this.status === MissionStatus.RETURNING && new Date() >= this.returnTime);
});

// Wirtualne pole - aktualny progress misji (0-100%)
MissionSchema.virtual('progress').get(function() {
  const now = new Date().getTime();
  const start = this.startTime.getTime();
  const end = this.returnTime.getTime();
  
  if (now >= end) return 100;
  if (now <= start) return 0;
  
  return Math.round(((now - start) / (end - start)) * 100);
});

// Metoda - aktualizuj status na podstawie czasu
MissionSchema.methods.updateStatus = function(): MissionStatus {
  const now = new Date();
  
  if (this.status === MissionStatus.COLLECTED) {
    return this.status;
  }
  
  if (now >= this.returnTime) {
    this.status = MissionStatus.COMPLETED;
  } else if (now >= this.miningEndTime) {
    this.status = MissionStatus.RETURNING;
  } else if (now >= this.arrivalTime) {
    this.status = MissionStatus.MINING;
  } else {
    this.status = MissionStatus.IN_PROGRESS;
  }
  
  return this.status;
};

export default mongoose.model<IMission, mongoose.Model<IMission, {}, IMissionMethods>>('Mission', MissionSchema);