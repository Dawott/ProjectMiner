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

export default api;