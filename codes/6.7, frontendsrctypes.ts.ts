export interface User {
  id: number;
  email: string;
  ringId: number;
  role: string;
}

export interface Staff {
  id: number;
  first_name: string;
  last_name: string;
  abbreviation: string;
  town: string;
  type: 'agricultural' | 'urban';
  hours_per_day: number;
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
  type: 'agricultural' | 'urban';
  hours_per_day: number;
  ring_name: string;
  start_date: string;
  end_date: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
}

export interface Ring {
  id: number;
  name: string;
  boundary: any; // GeoJSON
}