export interface Ring {
  id: number;
  name: string;
  office_town?: string;
  office_lat?: number;
  office_lng?: number;
  boundary?: any; // GeoJSON polygon
}
