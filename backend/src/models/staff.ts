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
  created_at: Date;
}
