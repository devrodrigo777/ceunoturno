import { AstroPosition } from './types';

export const POSITION_PRICES = {
  [AstroPosition.ZENITH]: 500,
  [AstroPosition.CELESTIAL_POLE]: 300,
  [AstroPosition.HORIZON_LEFT]: 150,
  [AstroPosition.HORIZON_RIGHT]: 150,
  [AstroPosition.NADIR]: 100,
};

export const TYPE_PRICES = {
  star: 0,
  planet: 300,
  nebula: 700
};

export const ASTRO_COLORS = [
  '#fde047', '#60a5fa', '#f87171', '#ffffff', '#c084fc',
  '#4ade80', '#fb923c', '#f472b6', '#2dd4bf', '#a78bfa'
];

export const INITIAL_ASTROS: any[] = [
  {
    id: '1',
    userName: 'Fundador',
    message: 'Que este céu brilhe para sempre.',
    position: AstroPosition.ZENITH,
    type: 'star',
    color: '#fde047',
    size: 16,
    x: 1500,
    y: 800,
    coordinate: 'RA 12h 30m / DEC +15°',
    createdAt: Date.now()
  }
];