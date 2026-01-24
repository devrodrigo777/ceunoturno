export enum AstroPosition {
  ZENITH = 'Zênite',
  HORIZON_LEFT = 'Horizonte Leste',
  HORIZON_RIGHT = 'Horizonte Oeste',
  NADIR = 'Nadir',
  HORIZON = 'Horizonte'
}

export type AstroType = 'star' | 'planet' | 'nebula';

export interface Astro {
  id: string;
  user_id: string;
  user_name: string;
  message: string;
  position: AstroPosition;
  type: AstroType;
  color: string;
  size: number;
  x: number; // Pixels in 3000x2000
  y: number; // Pixels in 3000x2000
  coordinate: string;
  created_at: number;
  image_url?: string | null;
  pulses?: number;
  views?: number;

  starmapEnabled?: boolean;
  starmapTitle?: string | null;
  starmapLocationLabel?: string | null;
  starmapLat?: number | null;
  starmapLng?: number | null;
  starmapDatetime?: string | null; // ISO
  starmapHideTime?: boolean | null;
  starmap_lat?: number | null;
  starmap_lng?: number | null;
}

export interface User {
  id: string;
  name: string;
  balance: number;
}