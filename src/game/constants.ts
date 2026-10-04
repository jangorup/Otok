import { BuildingDefinition, ResourceType } from './types';

export const MAP_WIDTH = 42;
export const MAP_HEIGHT = 42;
export const TILE_SIZE = 48; // pixels per tile in game world
export const CAMERA_ZOOM = 1.25; // camera zoom fixed at 1.25x

export const PLAYER_WIDTH = 28;
export const PLAYER_HEIGHT = 38;
export const PLAYER_SPEED = 145; // pixels per second

export const VISION_RADIUS = 5.2; // tiles radius revealed around player
export const RESOURCE_RESPAWN_MS = 30000; // 30 seconds respawn
export const DAY_CYCLE_MS = 240000; // 4 minutes per day/night cycle

export const BUILDINGS: Record<string, BuildingDefinition> = {
  HUT: {
    type: 'HUT',
    name: 'Utočište',
    description: 'Jednostavno drveno sklonište sa slamnatim krovom. Pruža osnovni zaklon pred noćnim morskim bičevima.',
    width: 2,
    height: 2,
    cost: {
      wood: 8,
      fibre: 6,
    },
    allowedGround: ['GRASS', 'FOREST_GRASS', 'SAND'],
  },
  STONE_HOUSE: {
    type: 'STONE_HOUSE',
    name: 'Kamena kuća',
    description: 'Čvrsto utočište od klesanog otočnog kamena s debelim zidovima. Sigurno skrovište od drevnih morskih sila.',
    width: 2,
    height: 2,
    cost: {
      wood: 12,
      stone: 14,
    },
    allowedGround: ['GRASS', 'FOREST_GRASS'],
  },
  BEACH_COTTAGE: {
    type: 'BEACH_COTTAGE',
    name: 'Obalna kolibica',
    description: 'Prostrana obalna kolibica na drvenim stupovima s pogledom na tajanstvene morske vode.',
    width: 3,
    height: 2,
    cost: {
      wood: 10,
      shells: 8,
      sand: 8,
    },
    allowedGround: ['SAND', 'GRASS'],
  },
};

export const DEFAULT_MAX_INVENTORY_CAPACITY = 16; // Ograničen kapacitet inventara

export const RESOURCE_INFO: Record<ResourceType, {
  name: string;
  unitName: string;
  color: string;
  toolAction: string;
}> = {
  TWIGS: {
    name: 'Grančice',
    unitName: '+1 Grančica',
    color: '#d97706',
    toolAction: 'Pokupi',
  },
  PEBBLES: {
    name: 'Kamenčići',
    unitName: '+1 Kamenčić',
    color: '#94a3b8',
    toolAction: 'Pokupi',
  },
  WOOD: {
    name: 'Drvo',
    unitName: '+1 Drvo',
    color: '#8b5a2b',
    toolAction: 'Cijepaj',
  },
  STONE: {
    name: 'Kamen',
    unitName: '+1 Kamen',
    color: '#94a3b8',
    toolAction: 'Razbij',
  },
  FIBRE: {
    name: 'Vlakna',
    unitName: '+1 Vlakna',
    color: '#10b981',
    toolAction: 'Uberi',
  },
  SHELL: {
    name: 'Školjka',
    unitName: '+1 Školjka',
    color: '#f472b6',
    toolAction: 'Pokupi',
  },
  SAND_PILE: {
    name: 'Pijesak',
    unitName: '+1 Pijesak',
    color: '#f59e0b',
    toolAction: 'Iskopaj',
  },
};

export const PET_INFO = {
  DOG: {
    id: 'DOG',
    name: 'Pas',
    defaultName: 'Bobi',
    icon: '🐶',
    description: 'Vjeran i zaigran psić koji te veselo prati mašući repom.',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  CAT: {
    id: 'CAT',
    name: 'Mačka',
    defaultName: 'Mica',
    icon: '🐱',
    description: 'Ugodna maca koja tiho prede i znatiželjno istražuje otok.',
    badgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
  },
  RABBIT: {
    id: 'RABBIT',
    name: 'Zec',
    defaultName: 'Uško',
    icon: '🐰',
    description: 'Pahuljasti zečić koji veselo poskakuje uz tvoje korake.',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  PARROT: {
    id: 'PARROT',
    name: 'Papiga',
    defaultName: 'Kiki',
    icon: '🦜',
    description: 'Šarena tropska papigica koja leprša krilima u tvom društvu.',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  HAMSTER: {
    id: 'HAMSTER',
    name: 'Hrčak',
    defaultName: 'Piko',
    icon: '🐹',
    description: 'Mali bucmasti hrčak koji neumorno kucka šapicama s punim obrazima.',
    badgeColor: 'bg-amber-600/20 text-amber-200 border-amber-600/40',
  },
} as const;

export const DEFAULT_CHARACTER = {
  name: 'Otočan',
  skinColor: '#fed7aa',
  hairStyle: 'SHORT' as const,
  hairColor: '#451a03',
  shirtColor: '#0d9488',
  pantsColor: '#d4c5b9',
  hatType: 'STRAW_HAT' as const,
};

