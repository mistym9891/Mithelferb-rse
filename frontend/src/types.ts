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

/**
 * Einsatzart einer Kraft. 'both' kam hinzu, weil manche Kräfte sowohl
 * landwirtschaftlich als auch städtisch eingesetzt werden – vorher mussten
 * sie dafür zweimal angelegt werden.
 */
export type EinsatzArt = 'agricultural' | 'urban' | 'both';

export interface Staff {
  id: number;
  first_name: string;
  last_name: string;
  abbreviation: string;
  town: string;
  lat?: number;
  lng?: number;
  /** 'both' = landwirtschaftlich und städtisch. */
  type: EinsatzArt;
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
  /** 'both' = landwirtschaftlich und städtisch. */
  type: EinsatzArt;
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
  /** Kurzzeichen für die Karte, z. B. „SHA“ -> Marker „MR SHA“. */
  short_code?: string | null;
  office_street?: string | null;
  office_town?: string;
  office_lat?: number;
  office_lng?: number;
  website?: string | null;
  /** Telefon und Ansprechpartner der Geschäftsstelle (Anzeige am MR-Zeichen). */
  office_phone?: string | null;
  office_contact?: string | null;
}

/** Ort oder Teilort eines Rings – wird beim Hineinzoomen eingeblendet. */
export interface RingTown {
  id: number;
  ring_id: number;
  plz: string;
  name: string;
  district: string | null;
  lat: number;
  lng: number;
}

export interface AdminRing {
  id: number;
  name: string;
  office_town: string | null;
  office_lat: number | null;
  office_lng: number | null;
  short_code: string | null;
  office_street: string | null;
  website: string | null;
  office_phone: string | null;
  office_contact: string | null;
  boundary_source: string | null;
  has_boundary: boolean;
  user_count: string;
  staff_count: string;
  gemeinde_count: string;
}
