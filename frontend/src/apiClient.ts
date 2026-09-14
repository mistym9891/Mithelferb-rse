import axios from 'axios';

/**
 * Gemeinsame Axios-Instanz. Liegt getrennt von api.ts, damit auch Hooks
 * (z. B. usePush) sie nutzen können, ohne Ringabhängigkeiten zu erzeugen.
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Bei abgelaufenem Token abmelden – aber nicht auf der Anmeldeseite selbst.
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && !location.pathname.startsWith('/login')) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
