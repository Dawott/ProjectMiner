import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Dodanie tokenów do requestów
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Resource - Interface
export interface Resources {
  iron: number;
  rareMetals: number;
  crystals: number;
  fuel: number;
}

export interface MiningBonus {
  iron?: number;
  rareMetals?: number;
  crystals?: number;
  fuel?: number;
}

export interface ResourcesResponse {
  success: boolean;
  data: {
    resources: Resources;
    faction: string;
    modifiers: {
      miningBonus: MiningBonus;
      buildCostReduction: number;
    };
  };
}

export interface ResourceUpdateResponse {
  success: boolean;
  message: string;
  data: {
    resources: Resources;
  };
}

export interface ResourceCollectResponse {
  success: boolean;
  message: string;
  data: {
    source: string;
    baseResources: Partial<Resources>;
    collectedResources: Partial<Resources>;
    factionBonus: MiningBonus;
    newTotal: Resources;
  };
}

// Statki - interface
export interface BuildCost {
  iron: number;
  rareMetals: number;
  crystals: number;
}

export interface ShipTemplate {
  _id: string;
  name: string;
  description: string;
  cargoCapacity: number;
  fuelConsumption: number;
  speed: number;
  tier: number;
  baseBuildCost: BuildCost;
  adjustedBuildCost: BuildCost;
  costReduction: number;
}

export interface ShipTemplatesResponse {
  success: boolean;
  data: {
    templates: ShipTemplate[];
    faction: string;
    costReductionPercent: number;
  };
}

export interface ShipTemplateResponse {
  success: boolean;
  data: {
    template: ShipTemplate;
  };
}

//Statki gracza - interface
export type ShipStatus = 'idle' | 'on_mission' | 'returning';

export interface PlayerShipTemplate {
  _id: string;
  name: string;
  description: string;
  cargoCapacity: number;
  fuelConsumption: number;
  baseSpeed: number;
  adjustedSpeed: number;
  tier: number;
}

export interface PlayerShip {
  _id: string;
  name: string;
  status: ShipStatus;
  currentMissionId?: string;
  createdAt: string;
  template: PlayerShipTemplate;
}

export interface FleetStats {
  totalShips: number;
  idleShips: number;
  onMissionShips: number;
  totalCargoCapacity: number;
}

export interface FleetResponse {
  success: boolean;
  data: {
    fleet: PlayerShip[];
    stats: FleetStats;
    speedModifier: number;
    speedBonusPercent: number;
  };
}

export interface BuildShipResponse {
  success: boolean;
  message: string;
  data: {
    ship: {
      _id: string;
      name: string;
      templateName: string;
      status: ShipStatus;
      createdAt: string;
    };
    cost: BuildCost;
    newResources: Resources;
  };
}

export interface DeleteShipResponse {
  success: boolean;
  message: string;
  data: {
    refund: BuildCost;
    newResources: Resources;
  };
}

// Auth API
export const authAPI = {
  register: (data: {
    username: string;
    email: string;
    password: string;
    faction: string;
  }) => api.post('/auth/register', data),

  login: (data: {
    email: string;
    password: string;
  }) => api.post('/auth/login', data),

  getMe: () => api.get('/auth/me')
};

//REsource API

export const resourcesAPI = {
  // Pobranie aktualnych zasobów gracza
  getResources: () => 
    api.get<ResourcesResponse>('/resources'),

  // Dodanie zasobów
  addResources: (resources: Partial<Resources>) =>
    api.patch<ResourceUpdateResponse>('/resources', {
      operation: 'add',
      resources
    }),

  // Odjęcie zasobów
  subtractResources: (resources: Partial<Resources>) =>
    api.patch<ResourceUpdateResponse>('/resources', {
      operation: 'subtract',
      resources
    }),

  // Zbieranie zasobów z bonusem frakcji
  collectResources: (resources: Partial<Resources>, source?: string) =>
    api.post<ResourceCollectResponse>('/resources/collect', {
      resources,
      source: source || 'manual'
    })
};

//Statki - api
export const shipsAPI = {
  // Pobranie wszystkich szablonów statków
  getTemplates: () =>
    api.get<ShipTemplatesResponse>('/ships/templates'),

  // Pobranie konkretnego szablonu
  getTemplate: (id: string) =>
    api.get<ShipTemplateResponse>(`/ships/templates/${id}`),

  // Budowa statku
  buildShip: (templateId: string, shipName?: string) =>
    api.post<BuildShipResponse>('/ships/build', { templateId, shipName }),

  // Flota gracza
  getFleet: () =>
    api.get<FleetResponse>('/ships/fleet'),

  getShip: (id: string) =>
    api.get<{ success: boolean; data: { ship: PlayerShip } }>(`/ships/fleet/${id}`),

  // Usunięcie statku (złomowanie)
  deleteShip: (id: string) =>
    api.delete<DeleteShipResponse>(`/ships/fleet/${id}`)
};

export default api;