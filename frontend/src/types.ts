export type Role = 'super_admin' | 'ring_admin' | 'member';

export interface User {
  id: number;
  email: string;
  ringId: number;
  role: Role;
  name?: string;
  ringName?: string;
  mustChangePassword?: boolean;
  termsAccepted?: boolean;
  privacyAccepted?: boolean;
}

export interface AdminUser {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  role: Role;
  ring_id: number;
  ring_name: string;
  active: boolean;
  must_change_password: boolean;
  last_login_at: string | null;
  created_at: string;
  terms_accepted_at: string | null;
  privacy_accepted_at: string | null;
}

export interface ResetRequest {
  token: string;
  requested_at: string;
  expires_at: string;
  user_name: string | null;
  user_email: string;
  ring_name: string;
}

export interface AuditEntry {
  id: number;
  action: string;
  target: string | null;
  detail: any;
  created_at: string;
  actor_name: string | null;
  actor_email: string | null;
}

export interface Staff {
  id: number;
  first_name: string;
  last_name: string;
  abbreviation: string;
  town: string;
  lat?: number;
  lng?: number;
  type: 'agricultural' | 'urban';
  gender: 'male' | 'female' | 'unknown';
  hours_per_day: number;
  supervisor?: string;
  phone: string;
  email: string;
  ring_id: number;
  start_date?: string;
  end_date?: string;
  availability_id?: number;
}

export interface AvailableStaff {
  id: number;
  abbreviation: string;
  town: string;
  lat?: number;
  lng?: number;
  type: 'agricultural' | 'urban';
  gender: 'male' | 'female' | 'unknown';
  hours_per_day: number;
  ring_id: number;
  ring_name: string;
  ring_website?: string | null;
  supervisor?: string;
  phone?: string;
  email?: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  is_own_ring: boolean;
  first_name?: string;
  last_name?: string;
}

export interface RingInfo {
  id: number;
  name: string;
  office_town?: string;
  office_lat?: number;
  office_lng?: number;
  website?: string | null;
}

export interface AdminRing {
  id: number;
  name: string;
  office_town: string | null;
  office_lat: number | null;
  office_lng: number | null;
  website: string | null;
  boundary_source: string | null;
  has_boundary: boolean;
  user_count: string;
  staff_count: string;
  gemeinde_count: string;
}
