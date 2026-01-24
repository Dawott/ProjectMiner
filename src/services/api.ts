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

export default api;