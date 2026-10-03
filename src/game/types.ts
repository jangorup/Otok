export type TileType = 
  | 'DEEP_WATER' 
  | 'WATER' 
  | 'SHALLOW_WATER' 
  | 'SAND' 
  | 'GRASS' 
  | 'FOREST_GRASS' 
  | 'HILL_ROCK' 
  | 'PATH';

export type ResourceType = 'WOOD' | 'STONE' | 'FIBRE' | 'SHELL' | 'SAND_PILE';

export interface ResourceNode {
  id: string;
  x: number; // tile x
  y: number; // tile y
  type: ResourceType;
  available: boolean;
  respawnTime?: number; // timestamp when it becomes available again
  variant: number; // for visual variation
}

export type BuildingType = 'HUT' | 'STONE_HOUSE' | 'BEACH_COTTAGE';

export interface BuildingCost {
  wood?: number;
  stone?: number;
  fibre?: number;
  shells?: number;
  sand?: number;
}

export interface BuildingDefinition {
  type: BuildingType;
  name: string; // in Croatian
  description: string;
  width: number; // in tiles
  height: number; // in tiles
  cost: BuildingCost;
  allowedGround: TileType[];
}

export interface PlacedBuilding {
  id: string;
  type: BuildingType;
  x: number; // top-left tile x
  y: number; // top-left tile y
  placedAt: number;
}

export interface Inventory {
  wood: number;
  stone: number;
  fibre: number;
  shells: number;
  sand: number;
}

export type PetType = 'DOG' | 'CAT' | 'RABBIT' | 'PARROT' | 'HAMSTER';

export interface PetState {
  type: PetType;
  name: string;
  x: number;
  y: number;
  direction: 'LEFT' | 'RIGHT';
  isMoving: boolean;
  happyTimer: number; // celebration / petted bounce
}

export interface CharacterCustomization {
  name: string;
  skinColor: string;
  hairStyle: 'SHORT' | 'LONG' | 'CURLY' | 'BAND' | 'NONE';
  hairColor: string;
  shirtColor: string;
  pantsColor: string;
  hatType: 'STRAW_HAT' | 'CAP' | 'FLOWER' | 'NONE';
}

export interface PlayerState {
  x: number; // world coordinates in pixels
  y: number;
  vx: number;
  vy: number;
  direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  isMoving: boolean;
  actionTimer: number; // For chopping/mining swing animation
  actionType?: ResourceType;
}

export interface FloatingText {
  id: string;
  x: number; // world x
  y: number; // world y
  text: string;
  color: string;
  createdAt: number;
  duration: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

export interface SmokeParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  maxAlpha: number;
  life: number;
  maxLife: number;
}

export interface GameSettings {
  soundEnabled: boolean;
  musicEnabled: boolean;
}

export interface WorldMeta {
  id: string;
  name: string;
  seed: number;
  createdAt: number;
  lastPlayedAt: number;
  buildingCount: number;
  revealedPercent: number;
  totalMaterials: number;
  characterName?: string;
  petType?: PetType;
  petName?: string;
}

export interface GameSaveState {
  version: number;
  worldId?: string;
  worldName?: string;
  seed?: number;
  createdAt?: number;
  lastPlayedAt?: number;
  character?: CharacterCustomization;
  pet?: {
    type: PetType;
    name: string;
  };
  player: {
    x: number;
    y: number;
    direction: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
  };
  inventory: Inventory;
  revealedTiles: boolean[][];
  placedBuildings: PlacedBuilding[];
  harvestedNodeIds: { id: string; respawnTime: number }[];
  timeOfDay: number;
}
