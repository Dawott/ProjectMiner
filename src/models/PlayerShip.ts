import mongoose, { Schema, Document, Types } from 'mongoose';

// Status statku
export enum ShipStatus {
  IDLE = 'idle',           // Dostępny
  ON_MISSION = 'on_mission', // W trakcie misji
  RETURNING = 'returning'    // Wraca z misji
}

// Interfejs statku gracza
export interface IPlayerShip extends Document {
  ownerId: Types.ObjectId;       // Właściciel statku
  templateId: Types.ObjectId;    // Szablon statku
  name: string;                  // Nazwa nadana przez gracza
  status: ShipStatus;
  currentMissionId?: Types.ObjectId;  // ID aktywnej misji (jeśli jest)
  createdAt: Date;
  updatedAt: Date;
}

const PlayerShipSchema = new Schema<IPlayerShip>({
  ownerId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  templateId: {
    type: Schema.Types.ObjectId,
    ref: 'ShipTemplate',
    required: true
  },
  name: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 30
  },
  status: {
    type: String,
    enum: Object.values(ShipStatus),
    default: ShipStatus.IDLE
  },
  currentMissionId: {
    type: Schema.Types.ObjectId,
    ref: 'Mission',
    default: null
  }
}, {
  timestamps: true
});

// Indeks złożony dla szybkiego wyszukiwania statków gracza
PlayerShipSchema.index({ ownerId: 1, status: 1 });

export default mongoose.model<IPlayerShip>('PlayerShip', PlayerShipSchema);