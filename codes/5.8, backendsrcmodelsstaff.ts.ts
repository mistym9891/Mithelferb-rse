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
  created_at: Date;
}