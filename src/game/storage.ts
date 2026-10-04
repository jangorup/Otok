import { GameSaveState, WorldMeta } from './types';
import { generateIslandMap } from './mapGenerator';
import { MAP_HEIGHT, MAP_WIDTH } from './constants';

const WORLDS_INDEX_KEY = 'mirni_otok_worlds_index_v1';
const WORLD_DATA_PREFIX = 'mirni_otok_world_data_';
const LAST_PLAYED_KEY = 'mirni_otok_last_world_id';
const LEGACY_SAVE_KEY = 'mirni_otok_save_v1';

export function getAllWorlds(): WorldMeta[] {
  try {
    const raw = localStorage.getItem(WORLDS_INDEX_KEY);
    let list: WorldMeta[] = raw ? JSON.parse(raw) : [];

    // Check if we need to migrate from legacy single save
    if (list.length === 0) {
      const legacyRaw = localStorage.getItem(LEGACY_SAVE_KEY);
      if (legacyRaw) {
        try {
          const legacy = JSON.parse(legacyRaw) as GameSaveState;
          if (legacy && legacy.player && legacy.inventory) {
            const legacyId = 'world_legacy_default';
            const meta: WorldMeta = {
              id: legacyId,
              name: 'Prvi Otok',
              seed: 42,
              createdAt: Date.now() - 3600000,
              lastPlayedAt: Date.now(),
              buildingCount: legacy.placedBuildings ? legacy.placedBuildings.length : 0,
              revealedPercent: computeRevealedPercent(legacy.revealedTiles),
              totalMaterials: computeTotalMaterials(legacy.inventory),
            };

            const fullState: GameSaveState = {
              ...legacy,
              worldId: legacyId,
              worldName: 'Prvi Otok',
              seed: 42,
              createdAt: meta.createdAt,
              lastPlayedAt: meta.lastPlayedAt,
            };

            localStorage.setItem(WORLD_DATA_PREFIX + legacyId, JSON.stringify(fullState));
            list = [meta];
            localStorage.setItem(WORLDS_INDEX_KEY, JSON.stringify(list));
            localStorage.setItem(LAST_PLAYED_KEY, legacyId);
          }
        } catch {
          // ignore error
        }
      }
    }

    return list.sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
  } catch (e) {
    console.error('Failed to get worlds list:', e);
    return [];
  }
}

export function saveWorld(state: GameSaveState): void {
  try {
    if (!state.worldId) {
      state.worldId = 'world_' + Date.now();
    }
    state.lastPlayedAt = Date.now();

    // 1. Save full state
    const serialized = JSON.stringify(state);
    localStorage.setItem(WORLD_DATA_PREFIX + state.worldId, serialized);

    // Also update legacy key for backward compatibility
    localStorage.setItem(LEGACY_SAVE_KEY, serialized);
    localStorage.setItem(LAST_PLAYED_KEY, state.worldId);

    // 2. Update index
    const worlds = getAllWorlds();
    const existingIdx = worlds.findIndex((w) => w.id === state.worldId);

    const meta: WorldMeta = {
      id: state.worldId,
      name: state.worldName || 'Otok Magle',
      seed: state.seed || 42,
      createdAt: state.createdAt || Date.now(),
      lastPlayedAt: state.lastPlayedAt,
      buildingCount: state.placedBuildings ? state.placedBuildings.length : 0,
      revealedPercent: computeRevealedPercent(state.revealedTiles),
      totalMaterials: computeTotalMaterials(state.inventory),
      characterName: state.character?.name,
      petType: state.pet?.type,
      petName: state.pet?.name,
    };

    if (existingIdx >= 0) {
      worlds[existingIdx] = meta;
    } else {
      worlds.unshift(meta);
    }

    localStorage.setItem(WORLDS_INDEX_KEY, JSON.stringify(worlds));
  } catch (e) {
    console.error('Failed to save world:', e);
  }
}

export function loadWorld(worldId: string): GameSaveState | null {
  try {
    const raw = localStorage.getItem(WORLD_DATA_PREFIX + worldId);
    if (raw) {
      const parsed = JSON.parse(raw) as GameSaveState;
      localStorage.setItem(LAST_PLAYED_KEY, worldId);
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load world:', e);
  }
  return null;
}

export function deleteWorld(worldId: string): void {
  try {
    localStorage.removeItem(WORLD_DATA_PREFIX + worldId);
    const worlds = getAllWorlds().filter((w) => w.id !== worldId);
    localStorage.setItem(WORLDS_INDEX_KEY, JSON.stringify(worlds));

    if (getLastPlayedWorldId() === worldId) {
      if (worlds.length > 0) {
        localStorage.setItem(LAST_PLAYED_KEY, worlds[0].id);
      } else {
        localStorage.removeItem(LAST_PLAYED_KEY);
      }
    }
  } catch (e) {
    console.error('Failed to delete world:', e);
  }
}

export function getLastPlayedWorldId(): string | null {
  try {
    return localStorage.getItem(LAST_PLAYED_KEY);
  } catch {
    return null;
  }
}

export function createNewWorld(
  name: string,
  customSeed?: number,
  character?: import('./types').CharacterCustomization,
  pet?: { type: import('./types').PetType; name: string }
): GameSaveState {
  const seed = customSeed ?? Math.floor(Math.random() * 99999) + 1;
  const worldId = 'world_' + Date.now();
  const map = generateIslandMap(seed);

  const initialRevealed = Array.from({ length: MAP_HEIGHT }, () =>
    Array.from({ length: MAP_WIDTH }, () => false)
  );

  const newSave: GameSaveState = {
    version: 1,
    worldId,
    worldName: name.trim() || 'Otok Magle',
    seed,
    createdAt: Date.now(),
    lastPlayedAt: Date.now(),
    character,
    pet,
    player: {
      x: map.initialPlayerPos.x,
      y: map.initialPlayerPos.y,
      direction: 'DOWN',
    },
    inventory: {
      wood: 0,
      stone: 0,
      fibre: 0,
      shells: 0,
      sand: 0,
    },
    revealedTiles: initialRevealed,
    placedBuildings: [],
    harvestedNodeIds: [],
    timeOfDay: 0.25,
  };

  saveWorld(newSave);
  return newSave;
}

// Helpers
function computeRevealedPercent(revealed?: boolean[][]): number {
  if (!revealed || revealed.length === 0) return 0;
  let count = 0;
  let total = 0;
  for (let r = 0; r < revealed.length; r++) {
    for (let c = 0; c < revealed[r].length; c++) {
      total++;
      if (revealed[r][c]) count++;
    }
  }
  return total > 0 ? Math.round((count / total) * 100) : 0;
}

function computeTotalMaterials(inventory?: { wood: number; stone: number; fibre: number; shells: number; sand: number }): number {
  if (!inventory) return 0;
  return (
    (inventory.wood || 0) +
    (inventory.stone || 0) +
    (inventory.fibre || 0) +
    (inventory.shells || 0) +
    (inventory.sand || 0)
  );
}

// Backward compatibility methods
export function saveGame(state: GameSaveState): void {
  saveWorld(state);
}

export function loadGame(): GameSaveState | null {
  const lastId = getLastPlayedWorldId();
  if (lastId) {
    const loaded = loadWorld(lastId);
    if (loaded) return loaded;
  }
  const worlds = getAllWorlds();
  if (worlds.length > 0) {
    return loadWorld(worlds[0].id);
  }
  return null;
}

export function clearSave(): void {
  try {
    const lastId = getLastPlayedWorldId();
    if (lastId) {
      deleteWorld(lastId);
    }
  } catch (e) {
    console.error('Failed to clear save:', e);
  }
}
