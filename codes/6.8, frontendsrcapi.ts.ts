import axios from 'axios';
import { Staff, AvailableStaff, Ring, User } from './types';

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

export const login = (email: string, password: string) =>
  api.post<{ token: string; user: User }>('/auth/login', { email, password });

export const getRings = () => api.get<{ type: string; features: any[] }>('/api/rings');

export const getAvailableStaff = (params?: { ringId?: number; type?: string }) =>
  api.get<AvailableStaff[]>('/api/available-staff', { params });

export const getMyStaff = () => api.get<Staff[]>('/api/staff');

export const createStaff = (data: Omit<Staff, 'id' | 'ring_id' | 'created_at'>) =>
  api.post<Staff>('/api/staff', data);

export const updateStaff = (id: number, data: Partial<Staff>) =>
  api.put<Staff>(`/api/staff/${id}`, data);

export const deleteStaff = (id: number) => api.delete(`/api/staff/${id}`);

export const setAvailability = (staffId: number, start_date: string, end_date: string) =>
  api.post(`/api/staff/${staffId}/availability`, { start_date, end_date });

export const removeAvailability = (staffId: number) =>
  api.delete(`/api/staff/${staffId}/availability`);