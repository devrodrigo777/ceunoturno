import { AstroPosition } from './types';

export const POSITION_PRICES = {
  [AstroPosition.ZENITH]: 500,
  [AstroPosition.HORIZON]: 300,
  [AstroPosition.HORIZON_LEFT]: 150,
  [AstroPosition.HORIZON_RIGHT]: 150,
  [AstroPosition.NADIR]: 100,
};

export const TYPE_PRICES = {
  star: 0,
  planet: 300,
  nebula: 700
};

export const ASTRO_AREAS = {
  center: "HORIZONTE",
  periphery: "PERIFERIA",
};

export interface AstroQuote {
  x: number;
  y: number;
  area: typeof ASTRO_AREAS[keyof typeof ASTRO_AREAS];
  type: "star" | "planet" | "nebula";
  color: string;
  too_close: boolean;
  base_price: number;
  type_price: number;
  total_price: number;
  final_size: number;
  coordinate: string;
  color_allowed: boolean;
}

export const PRICES = {
  TYPE: { star: 0, planet: 300, nebula: 700 },
  AREA: { center: 500, periphery: 100 }
};

export const ASTRO_COLORS = [
  '#fde047', '#68acff', '#f87171', '#ffffff', '#b267fd',
];

export const CENTER_LIMITS = {
  x: [1500, 2500],
  y: [1000, 2000],
}

export const ASTRO_NAMES = {
  'star': 'Estrela',
  'planet': 'Planeta',
  'nebula': 'Nebulosa',
};

export const INITIAL_ASTROS: any[] = [
  {
    id: '1',
    user_name: 'Fundador',
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