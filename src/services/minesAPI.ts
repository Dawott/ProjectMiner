import api from './api';

// Typy

export interface MineResources {
  iron: number;
  rareMetals: number;
  crystals: number;
  fuel: number;
}

export interface Mine {
  mineId: string;
  celestialBodyId: string;
  celestialBodyName: string;
  level: number;
  lastCollected: string;
  createdAt: string;
  productionPerHour: MineResources;
  accumulatedResources: MineResources;
  hoursAccumulated: number;
  upgradeCost: Omit<MineResources, 'fuel'> | null;
  canUpgrade: boolean;
}

export interface MineStats {
  totalMines: number;
  totalProductionPerHour: MineResources;
  totalAccumulated: MineResources;
  maxAccumulationHours: number;
}

// Odpowiedzi

export interface MineListResponse {
  success: boolean;
  data: {
    mines: Mine[];
    stats: MineStats;
  };
}

export interface BuildMineResponse {
  success: boolean;
  message: string;
  data: {
    mine: {
      mineId: string;
      celestialBodyId: string;
      celestialBodyName: string;
      level: number;
      lastCollected: string;
      createdAt: string;
      productionPerHour: MineResources;
    };
    cost: Omit<MineResources, 'fuel'>;
    newResources: MineResources;
  };
}

export interface CollectMineResponse {
  success: boolean;
  message: string;
  data: {
    celestialBodyId: string;
    celestialBodyName: string;
    collectedResources: MineResources;
    hoursAccumulated: number;
    newResources: MineResources;
  };
}

export interface CollectAllMinesResponse {
  success: boolean;
  message: string;
  data: {
    totalCollected: MineResources;
    minesCollected: number;
    details: Array<{
      celestialBodyId: string;
      celestialBodyName: string;
      collected: MineResources;
      hours: number;
    }>;
    newResources: MineResources;
  };
}

export interface MinePreviewData {
  celestialBody: {
    _id: string;
    name: string;
    type: string;
    resourceModifiers: MineResources;
    currentMines: number;
    maxMines: number;
  };
  mine: {
    level: number;
    buildCost: Omit<MineResources, 'fuel'>;
    productionPerHour: MineResources;
    productionPerDay: MineResources;
  };
  playerResources: MineResources;
  canBuild: boolean;
  issues: string[];
}

export interface MinePreviewResponse {
  success: boolean;
  data: {
    preview: MinePreviewData;
  };
}

// API

export const minesAPI = {
  // Pobierz wszystkie kopalnie gracza
  getAll: () =>
    api.get<MineListResponse>('/mines'),

  // Zbuduj kopalnię
  build: (celestialBodyId: string) =>
    api.post<BuildMineResponse>('/mines/build', { celestialBodyId }),

  // Zbierz zasoby z konkretnej kopalni
  collect: (celestialBodyId: string) =>
    api.post<CollectMineResponse>(`/mines/${celestialBodyId}/collect`),

  // Zbierz zasoby ze wszystkich kopalni
  collectAll: () =>
    api.post<CollectAllMinesResponse>('/mines/collect-all'),

  // Podgląd przed budową
  preview: (celestialBodyId: string) =>
    api.get<MinePreviewResponse>(`/mines/preview/${celestialBodyId}`)
};

export default minesAPI;