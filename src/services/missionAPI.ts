import api from './api';

// Typy

export type MissionStatus = 'in_progress' | 'mining' | 'returning' | 'completed' | 'collected';
export type MissionType = 'mining' | 'exploration';

export interface MinedResources {
  iron: number;
  rareMetals: number;
  crystals: number;
  fuel: number;
}

export interface MissionShip {
  _id: string;
  name: string;
  templateName: string;
  cargoCapacity?: number;
  speed?: number;
}

export interface MissionTarget {
  _id: string;
  name: string;
  type: string;
  isTemporary?: boolean;
}

export interface MissionTimes {
  startTime: string;
  arrivalTime: string;
  miningEndTime: string;
  returnTime: string;
  travelTimeMinutes: number;
  miningTimeMinutes: number;
  totalTimeMinutes: number;
}

export interface Mission {
  _id: string;
  status: MissionStatus;
  type: MissionType;
  ship: MissionShip;
  target: MissionTarget;
  times: MissionTimes;
  fuelUsed: number;
  distance: number;
  progress: number;
  minedResources?: MinedResources;
  isReadyToCollect: boolean;
}

export interface MissionStats {
  total: number;
  inProgress: number;
  mining: number;
  returning: number;
  readyToCollect: number;
}

// Odpowiedzi

export interface MissionListResponse {
  success: boolean;
  data: {
    missions: Mission[];
    stats: MissionStats;
  };
}

export interface MissionDetailResponse {
  success: boolean;
  data: {
    mission: Mission & {
      bonusCollected?: boolean;
    };
  };
}

export interface SendMissionResponse {
  success: boolean;
  message: string;
  data: {
    mission: Mission;
    newResources: {
      iron: number;
      rareMetals: number;
      crystals: number;
      fuel: number;
    };
  };
}

export interface MissionPreview {
  ship: {
    _id: string;
    name: string;
    status: string;
    template: {
      name: string;
      cargoCapacity: number;
      speed: number;
      fuelConsumption: number;
    };
  };
  target: {
    _id: string;
    name: string;
    type: string;
    distance: number;
    miningDifficulty: number;
    resourceModifiers: {
      iron: number;
      rareMetals: number;
      crystals: number;
      fuel: number;
    };
    expiresAt?: string;
  };
  mission: {
    travelTimeMinutes: number;
    miningTimeMinutes: number;
    totalTimeMinutes: number;
    fuelNeeded: number;
    playerFuel: number;
  };
  canSend: boolean;
  issues: string[];
}

export interface MissionPreviewResponse {
  success: boolean;
  data: {
    preview: MissionPreview;
  };
}

export interface CollectMissionResponse {
  success: boolean;
  message: string;
  data: {
    missionId: string;
    shipName: string;
    targetName: string;
    minedResources: MinedResources;
    bonusCollected: boolean;
    newResources: {
      iron: number;
      rareMetals: number;
      crystals: number;
      fuel: number;
    };
  };
}

export interface CollectAllMissionsResponse {
  success: boolean;
  message: string;
  data: {
    collectedCount: number;
    totalResources: MinedResources;
    missions: Array<{
      missionId: string;
      shipName: string;
      targetName: string;
      minedResources: MinedResources;
    }>;
    newResources: {
      iron: number;
      rareMetals: number;
      crystals: number;
      fuel: number;
    };
  };
}

// API

export const missionAPI = {
  // Pobierz wszystkie misje gracza
  getAll: (activeOnly: boolean = true) =>
    api.get<MissionListResponse>('/missions', {
      params: activeOnly ? { active: 'true' } : {}
    }),

  // Pobierz misje po statusie
  getByStatus: (status: MissionStatus) =>
    api.get<MissionListResponse>('/missions', {
      params: { status }
    }),

  // Pobierz szczegóły misji
  getById: (id: string) =>
    api.get<MissionDetailResponse>(`/missions/${id}`),

  // Wyślij statek na misję
  send: (shipId: string, targetId: string) =>
    api.post<SendMissionResponse>('/missions/send', { shipId, targetId }),

  // Podgląd misji przed wysłaniem
  preview: (shipId: string, targetId: string) =>
    api.get<MissionPreviewResponse>(`/missions/preview/${shipId}/${targetId}`),

  // Odbierz zasoby z ukończonej misji
  collect: (missionId: string) =>
    api.post<CollectMissionResponse>(`/missions/${missionId}/collect`),

  // Odbierz zasoby ze wszystkich ukończonych misji
  collectAll: () =>
    api.post<CollectAllMissionsResponse>('/missions/collect-all')
};

export default missionAPI;