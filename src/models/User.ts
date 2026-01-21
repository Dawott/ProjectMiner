import mongoose, {Schema, Document} from 'mongoose';

export enum Faction {
    EU = 'EU',
    CHINA = 'CHINY',
    USA = 'USA',
    JAPAN = 'JAPONIA'
}

// Wzorzec zasobów
export interface IResources {
    iron: number;
    rareMetals: number;
    crystals: number;
    fuel: number;
}

//Modyfikatory frakcji
export interface IFactionModifiers {
    miningBonus: {
        iron?: number;
        rareMetals?: number;
        crystals?: number;
        fuel?: number;
    };
    shipSpeed: number;
    buildCostReduction: number;
}

// Interfejs Użytkownika
export interface IUser extends Document {
    username: string;
    email: string;
    password: string;           
    faction: Faction;
    resources: IResources;
    createdAt: Date;
    updatedAt: Date;
}

//Zasoby - schemat
const ResourcesSchema = new Schema<IResources>({
  iron: { type: Number, default: 100 },
  rareMetals: { type: Number, default: 20 },
  crystals: { type: Number, default: 10 },
  fuel: { type: Number, default: 50 }
}, { _id: false });

//Użytkownik - schemat
const UserSchema = new Schema<IUser>({
  username: {
    type: String,
    required: true,
    unique: true,
    minlength: 3,
    maxlength: 20
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  faction: {
    type: String,
    enum: Object.values(Faction),
    required: true
  },
  resources: {
    type: ResourcesSchema,
    default: () => ({})
  }
}, {
  timestamps: true
});

export default mongoose.model<IUser>('User', UserSchema);