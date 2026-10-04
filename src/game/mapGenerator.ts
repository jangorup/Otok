import { MAP_WIDTH, MAP_HEIGHT, TILE_SIZE } from './constants';
import { TileType, ResourceNode, NPCEntity } from './types';
import { NPC_VILLAGERS } from './storyData';

export interface GameMap {
  tiles: TileType[][];
  resources: ResourceNode[];
  initialPlayerPos: { x: number; y: number };
  npcs: NPCEntity[];
}

// Simple deterministic noise for reproducible organic island generation
function pseudoNoise(x: number, y: number, seed: number = 42): number {
  const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453123;
  return n - Math.floor(n);
}

function smoothNoise(x: number, y: number, scale: number = 8, seed: number = 42): number {
  const nx = x / scale;
  const ny = y / scale;
  const x0 = Math.floor(nx);
  const x1 = x0 + 1;
  const y0 = Math.floor(ny);
  const y1 = y0 + 1;

  const sx = nx - x0;
  const sy = ny - y0;

  const n00 = pseudoNoise(x0, y0, seed);
  const n10 = pseudoNoise(x1, y0, seed);
  const n01 = pseudoNoise(x0, y1, seed);
  const n11 = pseudoNoise(x1, y1, seed);

  const ix0 = n00 * (1 - sx) + n10 * sx;
  const ix1 = n01 * (1 - sx) + n11 * sx;

  return ix0 * (1 - sy) + ix1 * sy;
}

export function generateIslandMap(seed: number = 42): GameMap {
  const tiles: TileType[][] = [];
  const resources: ResourceNode[] = [];

  const cx = MAP_WIDTH / 2;
  const cy = MAP_HEIGHT / 2;

  let resourceCounter = 1;

  for (let y = 0; y < MAP_HEIGHT; y++) {
    const row: TileType[] = [];
    for (let x = 0; x < MAP_WIDTH; x++) {
      // Distance from center of the island
      const dx = (x - cx) / (MAP_WIDTH * 0.45);
      const dy = (y - cy) / (MAP_HEIGHT * 0.45);
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Multi-octave organic coast noise based on island seed
      const n1 = smoothNoise(x, y, 7, seed + 101);
      const n2 = smoothNoise(x, y, 3, seed + 202) * 0.4;
      const islandElevation = 1.05 - dist + (n1 + n2 - 0.7) * 0.48;

      let tile: TileType;

      if (islandElevation < 0.22) {
        tile = 'DEEP_WATER';
      } else if (islandElevation < 0.38) {
        tile = 'WATER';
      } else if (islandElevation < 0.47) {
        tile = 'SHALLOW_WATER';
      } else if (islandElevation < 0.6) {
        tile = 'SAND';
      } else if (islandElevation > 0.76 && x < cx) {
        // Lush forest grove in western/central area
        tile = 'FOREST_GRASS';
      } else {
        tile = 'GRASS';
      }

      row.push(tile);
    }
    tiles.push(row);
  }

  // Guaranteed safe dry land spawn (never in water or adjacent to water)
  const isWaterTile = (tx: number, ty: number) => {
    if (tx < 1 || tx >= MAP_WIDTH - 1 || ty < 1 || ty >= MAP_HEIGHT - 1) return true;
    const t = tiles[ty][tx];
    return t === 'DEEP_WATER' || t === 'WATER' || t === 'SHALLOW_WATER';
  };

  let spawnX = Math.floor(cx);
  let spawnY = Math.floor(cy);
  let bestCandidate = { x: Math.floor(cx), y: Math.floor(cy), score: -Infinity };

  for (let y = 3; y < MAP_HEIGHT - 3; y++) {
    for (let x = 3; x < MAP_WIDTH - 3; x++) {
      if (!isWaterTile(x, y)) {
        // Count dry surrounding tiles in 3x3 to ensure open safe land
        let dryCount = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (!isWaterTile(x + dx, y + dy)) {
              dryCount++;
            }
          }
        }

        if (dryCount === 9) {
          const distToPreferred = Math.hypot(x - cx, y - (cy + 4));
          const score = 100 - distToPreferred;
          if (score > bestCandidate.score) {
            bestCandidate = { x, y, score };
          }
        }
      }
    }
  }

  spawnX = bestCandidate.x;
  spawnY = bestCandidate.y;

  // Populate Resource Nodes thoughtfully
  for (let y = 2; y < MAP_HEIGHT - 2; y++) {
    for (let x = 2; x < MAP_WIDTH - 2; x++) {
      const tile = tiles[y][x];

      // Avoid placing resources directly on the spawn clearing
      const isStartArea = Math.abs(x - spawnX) <= 1 && Math.abs(y - spawnY) <= 1;
      if (isStartArea) continue;

      const rand = pseudoNoise(x * 3.7, y * 4.1, seed + 777);

      if (tile === 'SAND') {
        if (rand < 0.1) {
          resources.push({
            id: `res_${resourceCounter++}`,
            x,
            y,
            type: 'SHELL',
            available: true,
            variant: Math.floor(rand * 30) % 3,
          });
        } else if (rand > 0.88) {
          resources.push({
            id: `res_${resourceCounter++}`,
            x,
            y,
            type: 'SAND_PILE',
            available: true,
            variant: 0,
          });
        }
      } else if (tile === 'GRASS') {
        if (rand < 0.08) {
          resources.push({
            id: `res_${resourceCounter++}`,
            x,
            y,
            type: 'WOOD', // Olive tree / coastal tree
            available: true,
            variant: Math.floor(rand * 50) % 3,
          });
        } else if (rand > 0.08 && rand < 0.17) {
          resources.push({
            id: `res_${resourceCounter++}`,
            x,
            y,
            type: 'FIBRE', // Mediterranean lavender / shrubs
            available: true,
            variant: Math.floor(rand * 40) % 3,
          });
        } else if (rand > 0.86) {
          resources.push({
            id: `res_${resourceCounter++}`,
            x,
            y,
            type: 'STONE', // Natural weathered boulder
            available: true,
            variant: Math.floor(rand * 25) % 3,
          });
        }
      } else if (tile === 'FOREST_GRASS') {
        if (rand < 0.22) {
          resources.push({
            id: `res_${resourceCounter++}`,
            x,
            y,
            type: 'WOOD',
            available: true,
            variant: Math.floor(rand * 60) % 3,
          });
        } else if (rand >= 0.22 && rand < 0.35) {
          resources.push({
            id: `res_${resourceCounter++}`,
            x,
            y,
            type: 'FIBRE',
            available: true,
            variant: Math.floor(rand * 45) % 3,
          });
        } else if (rand >= 0.35 && rand < 0.44) {
          resources.push({
            id: `res_${resourceCounter++}`,
            x,
            y,
            type: 'STONE',
            available: true,
            variant: Math.floor(rand * 30) % 3,
          });
        }
      }
    }
  }

  // Place NPCs on dry land near spawn & interesting landmarks
  const npcs: NPCEntity[] = [];

  const occupiedTiles = new Set<string>();
  occupiedTiles.add(`${spawnX},${spawnY}`);

  const findFreeDryTile = (targetX: number, targetY: number, preferredTile?: TileType): { x: number; y: number } => {
    let bestDist = Infinity;
    let bestX = spawnX;
    let bestY = spawnY;

    for (let r = 0; r < 14; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          const tx = targetX + dx;
          const ty = targetY + dy;
          if (tx < 2 || tx >= MAP_WIDTH - 2 || ty < 2 || ty >= MAP_HEIGHT - 2) continue;
          const key = `${tx},${ty}`;
          if (occupiedTiles.has(key)) continue;

          const t = tiles[ty][tx];
          if (t === 'DEEP_WATER' || t === 'WATER' || t === 'SHALLOW_WATER') continue;

          let matchWeight = 0;
          if (preferredTile && t === preferredTile) matchWeight = -2;

          const d = Math.hypot(dx, dy) + matchWeight;
          if (d < bestDist) {
            bestDist = d;
            bestX = tx;
            bestY = ty;
          }
        }
      }
      if (bestDist < Infinity && r >= 3) break;
    }

    occupiedTiles.add(`${bestX},${bestY}`);
    return { x: bestX, y: bestY };
  };

  // 1. Starac Goran (near spawn clearing)
  const posGoran = findFreeDryTile(spawnX + 2, spawnY - 1, 'GRASS');
  npcs.push({
    ...NPC_VILLAGERS[0],
    tileX: posGoran.x,
    tileY: posGoran.y,
    x: posGoran.x * TILE_SIZE + TILE_SIZE / 2,
    y: posGoran.y * TILE_SIZE + TILE_SIZE / 2,
  });

  // 2. Ribar Mate (near southern/eastern shore)
  const posMate = findFreeDryTile(spawnX - 3, spawnY + 2, 'SAND');
  npcs.push({
    ...NPC_VILLAGERS[1],
    tileX: posMate.x,
    tileY: posMate.y,
    x: posMate.x * TILE_SIZE + TILE_SIZE / 2,
    y: posMate.y * TILE_SIZE + TILE_SIZE / 2,
  });

  // 3. Travarica Mara (near forest/grove north-west)
  const posMara = findFreeDryTile(spawnX - 4, spawnY - 4, 'FOREST_GRASS');
  npcs.push({
    ...NPC_VILLAGERS[2],
    tileX: posMara.x,
    tileY: posMara.y,
    x: posMara.x * TILE_SIZE + TILE_SIZE / 2,
    y: posMara.y * TILE_SIZE + TILE_SIZE / 2,
  });

  // Filter out any resource node that ended up on the same tile as an NPC
  const cleanedResources = resources.filter((res) => !occupiedTiles.has(`${res.x},${res.y}`));

  // Initial player spawn position on the peaceful southern beach
  const initialPlayerPos = {
    x: spawnX * TILE_SIZE + TILE_SIZE / 2,
    y: spawnY * TILE_SIZE + TILE_SIZE / 2,
  };

  return {
    tiles,
    resources: cleanedResources,
    initialPlayerPos,
    npcs,
  };
}
