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
  userId: string;
  userName: string;
  message: string;
  position: AstroPosition;
  type: AstroType;
  color: string;
  size: number;
  x: number; // Pixels in 3000x2000
  y: number; // Pixels in 3000x2000
  coordinate: string;
  createdAt: number;
}

export interface User {
  id: string;
  name: string;
  balance: number;
}