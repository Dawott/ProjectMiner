import api from './api';

// Typy dla ciał niebieskich
export type CelestialBodyType = 'planet' | 'moon' | 'asteroid';

export interface ResourceModifiers {
  iron: number;
  rareMetals: number;
  crystals: number;
  fuel: number;
}

export interface PlayerMine {
  level: number;
  lastCollected: string;
}

export interface CelestialBody {
  _id: string;
  name: string;
  type: CelestialBodyType;
  description: string;
  distance: number;
  resourceModifiers: ResourceModifiers;
  miningDifficulty: number;
  isTemporary: boolean;
  expiresAt?: string;
  timeUntilExpire?: number;
  bonusResources?: Partial<ResourceModifiers>;
  maxMines: number;
  currentMines: number;
  playerMine?: PlayerMine;
  canBuildMine: boolean;
  estimatedTravelTime: number;
}

export interface CelestialStats {
  totalPlanets: number;
  totalMoons: number;
  totalAsteroids: number;
  playerMines: number;
}

export interface CelestialListResponse {
  success: boolean;
  data: {
    bodies: CelestialBody[];
    stats: CelestialStats;
  };
}

export interface CelestialDetailResponse {
  success: boolean;
  data: {
    body: CelestialBody & {
      mines: Array<{
        ownerId: string;
        level: number;
        isOwn: boolean;
      }>;
    };
  };
}

export interface AsteroidListResponse {
  success: boolean;
  data: {
    asteroids: CelestialBody[];
    cleanedExpired: number;
  };
}

// API dla ciał niebieskich
export const celestialAPI = {
  // Pobierz wszystkie aktywne ciała niebieskie
  getAll: () => 
    api.get<CelestialListResponse>('/celestial'),

  // Pobierz tylko planety i księżyce
  getPlanets: () => 
    api.get<CelestialListResponse>('/celestial/planets'),

  // Pobierz tylko aktywne asteroidy
  getAsteroids: () => 
    api.get<AsteroidListResponse>('/celestial/asteroids'),

  // Pobierz szczegóły konkretnego ciała
  getById: (id: string) => 
    api.get<CelestialDetailResponse>(`/celestial/${id}`),

  // Generuj asteroidy (do testów)
  spawnAsteroids: (count: number = 3, days: number = 3) =>
    api.post('/celestial/spawn-asteroids', { count, days })
};

export default celestialAPI;