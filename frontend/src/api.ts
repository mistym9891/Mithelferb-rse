import api from './apiClient';
import { Staff, AvailableStaff, RingInfo, User, AdminUser, ResetRequest, AuditEntry, Role, AdminRing } from './types';

export const login = (email: string, password: string) =>
  api.post<{ token: string; user: User }>('/auth/login', { email, password });

export const getRings = () => api.get<{ type: string; features: any[] }>('/api/rings');
export const getRingList = () => api.get<RingInfo[]>('/api/rings/list');

export const getAvailableStaff = (params?: { ringId?: number; type?: string }) =>
  api.get<AvailableStaff[]>('/api/available-staff', { params });

export const getMyStaff = () => api.get<Staff[]>('/api/staff');

export const createStaff = (data: Partial<Staff>) => api.post<Staff>('/api/staff', data);
export const updateStaff = (id: number, data: Partial<Staff>) => api.put<Staff>(`/api/staff/${id}`, data);
export const deleteStaff = (id: number) => api.delete(`/api/staff/${id}`);

export const setAvailability = (staffId: number, start_date: string, end_date: string) =>
  api.post(`/api/staff/${staffId}/availability`, { start_date, end_date });

export const removeAvailability = (staffId: number) =>
  api.delete(`/api/staff/${staffId}/availability`);

// ------------------------------------------------------------ Rechtstexte

export const getLegal = () =>
  api.get<{ terms: { version: string; text: string }; privacy: { version: string; text: string } }>('/auth/legal');

export const acceptLegal = () => api.post('/auth/accept-legal', { terms: true, privacy: true });

// ------------------------------------------------------------------ Konto

export const getMe = () => api.get<{ user: User }>('/auth/me');

export const changePassword = (currentPassword: string, newPassword: string) =>
  api.post('/auth/change-password', { currentPassword, newPassword });

export const forgotPassword = (email: string) =>
  api.post<{ success: boolean; message: string }>('/auth/forgot-password', { email });

export const getResetRequest = (token: string) =>
  api.get<{ request: { userName: string; userEmail: string; ringName: string; expiresAt: string; handled: boolean; cancelled: boolean; expired: boolean } }>(
    `/auth/reset-request/${token}`);

export const generateResetPassword = (token: string) =>
  api.post<{ userName: string; userEmail: string; newPassword: string; hint: string }>(
    `/auth/reset-request/${token}/generate`);

// ------------------------------------------------------------- Verwaltung

export const getAdminUsers = () => api.get<AdminUser[]>('/api/admin/users');

export const createAdminUser = (data: { email: string; name: string; phone?: string; role: Role; ringId?: number }) =>
  api.post<{ id: number; initialPassword: string; hint: string }>('/api/admin/users', data);

export const updateAdminUser = (id: number, data: Partial<Pick<AdminUser, 'name' | 'phone' | 'email' | 'role' | 'active'>>) =>
  api.put(`/api/admin/users/${id}`, data);

export const deleteAdminUser = (id: number) => api.delete(`/api/admin/users/${id}`);

export const resetUserPassword = (id: number) =>
  api.post<{ userName: string; newPassword: string; hint: string }>(`/api/admin/users/${id}/reset-password`);

export const getResetRequests = () => api.get<ResetRequest[]>('/api/admin/reset-requests');

export const getAuditLog = () => api.get<AuditEntry[]>('/api/admin/audit');

export const getNetworkInfo = () =>
  api.get<{ appUrl: string | null; lanAddresses: string[]; frontendPort: number }>('/api/network-info');

// ------------------------------------------------- Ringe (nur Super-Admin)

export const getAdminRings = () => api.get<AdminRing[]>('/api/admin/rings');

export const createAdminRing = (data: { name: string; officeTown?: string; website?: string }) =>
  api.post<{ id: number; name: string; geocoded: boolean; hint?: string }>('/api/admin/rings', data);

export const updateAdminRing = (id: number, data: { name?: string; officeTown?: string; website?: string }) =>
  api.put(`/api/admin/rings/${id}`, data);

export const deleteAdminRing = (id: number) => api.delete(`/api/admin/rings/${id}`);
