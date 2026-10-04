import {
  MAP_WIDTH,
  MAP_HEIGHT,
  TILE_SIZE,
  PLAYER_SPEED,
  VISION_RADIUS,
  RESOURCE_RESPAWN_MS,
  DAY_CYCLE_MS,
  BUILDINGS,
  RESOURCE_INFO,
  DEFAULT_CHARACTER,
} from './constants';
import { generateIslandMap, GameMap } from './mapGenerator';
import { soundSystem } from './audio';
import { saveWorld, loadWorld, loadGame, createNewWorld } from './storage';
import {
  PlayerState,
  Inventory,
  PlacedBuilding,
  FloatingText,
  Particle,
  SmokeParticle,
  BuildingType,
  ResourceNode,
  GameSaveState,
  CharacterCustomization,
  PetState,
  NPCEntity,
} from './types';

export class GameEngine {
  public worldId: string = 'world_default';
  public worldName: string = 'Otok Magle';
  public seed: number = 42;
  public createdAt: number = Date.now();
  public character: CharacterCustomization;
  public pet: PetState;
  public map: GameMap;
  public player: PlayerState;
  public inventory: Inventory;
  public revealedTiles: boolean[][];
  public placedBuildings: PlacedBuilding[];
  public floatingTexts: FloatingText[];
  public particles: Particle[];
  public smokeParticles: SmokeParticle[];
  public timeOfDay: number; // 0 to 1
  public gameTime: number; // seconds
  public camera: { x: number; y: number };

  // Story & Secrets State
  public targetNpc: NPCEntity | null = null;
  public discoveredSecretIds: string[] = [];
  public talkedToNpcIds: string[] = [];
  public hasSeenIntro: boolean = false;

  public placementMode: {
    active: boolean;
    buildingType: BuildingType;
    tileX: number;
    tileY: number;
    isValid: boolean;
  } | null = null;

  private lastSaveTime: number = 0;
  private smokeSpawnTimer: number = 0;
  private footstepTimer: number = 0;

  // Input state
  private inputVector: { x: number; y: number } = { x: 0, y: 0 };

  // Callbacks for UI updates
  public onInventoryChange?: (inv: Inventory) => void;
  public onTargetNodeChange?: (node: ResourceNode | null) => void;
  public onTargetNpcChange?: (npc: NPCEntity | null) => void;
  public onOpenDialogue?: (npc: NPCEntity) => void;
  public onSecretDiscovered?: (secretId: string) => void;
  public onTimeChange?: (timeOfDay: number) => void;

  private currentTargetNode: ResourceNode | null = null;

  constructor(targetWorldId?: string) {
    this.inventory = {
      wood: 0,
      stone: 0,
      fibre: 0,
      shells: 0,
      sand: 0,
    };
    this.revealedTiles = Array.from({ length: MAP_HEIGHT }, () =>
      Array.from({ length: MAP_WIDTH }, () => false)
    );
    this.placedBuildings = [];
    this.floatingTexts = [];
    this.particles = [];
    this.smokeParticles = [];
    this.timeOfDay = 0.25;
    this.gameTime = 0;

    // Load specified world, or last played world, or create initial world
    let saved: GameSaveState | null = null;
    if (targetWorldId) {
      saved = loadWorld(targetWorldId);
    }
    if (!saved) {
      saved = loadGame();
    }
    if (!saved) {
      saved = createNewWorld('Otok Magle', 42);
    }

    this.worldId = saved.worldId || 'world_' + Date.now();
    this.worldName = saved.worldName || 'Otok Magle';
    this.seed = saved.seed || 42;
    this.createdAt = saved.createdAt || Date.now();
    this.hasSeenIntro = saved.hasSeenIntro ?? false;
    this.discoveredSecretIds = saved.discoveredSecretIds || [];
    this.talkedToNpcIds = saved.talkedToNpcIds || [];

    this.map = generateIslandMap(this.seed);
    this.player = {
      x: saved.player?.x ?? this.map.initialPlayerPos.x,
      y: saved.player?.y ?? this.map.initialPlayerPos.y,
      vx: 0,
      vy: 0,
      direction: saved.player?.direction || 'DOWN',
      isMoving: false,
      actionTimer: 0,
    };
    this.camera = { x: this.player.x, y: this.player.y };

    this.inventory = { ...saved.inventory };
    if (saved.revealedTiles && saved.revealedTiles.length === MAP_HEIGHT) {
      this.revealedTiles = saved.revealedTiles;
    }
    this.placedBuildings = saved.placedBuildings || [];
    this.timeOfDay = saved.timeOfDay ?? 0.25;

    // Restore harvested nodes
    if (saved.harvestedNodeIds) {
      const now = Date.now();
      saved.harvestedNodeIds.forEach((h) => {
        const node = this.map.resources.find((r) => r.id === h.id);
        if (node) {
          if (h.respawnTime > now) {
            node.available = false;
            node.respawnTime = h.respawnTime;
          }
        }
      });
    }

    this.character = saved.character ? { ...saved.character } : { ...DEFAULT_CHARACTER };
    const savedPet = saved.pet || { type: 'DOG', name: 'Bobi' };
    this.pet = {
      type: savedPet.type,
      name: savedPet.name,
      x: this.player.x - 26,
      y: this.player.y + 8,
      direction: 'RIGHT',
      isMoving: false,
      happyTimer: 0,
    };

    // Ensure player is on dry land (never in water)
    const isWater = (wx: number, wy: number) => {
      const tx = Math.floor(wx / TILE_SIZE);
      const ty = Math.floor(wy / TILE_SIZE);
      if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return true;
      const t = this.map.tiles[ty][tx];
      return t === 'DEEP_WATER' || t === 'WATER' || t === 'SHALLOW_WATER';
    };

    if (isWater(this.player.x, this.player.y) || this.checkCollision(this.player.x, this.player.y)) {
      this.player.x = this.map.initialPlayerPos.x;
      this.player.y = this.map.initialPlayerPos.y;
      this.camera.x = this.player.x;
      this.camera.y = this.player.y;
    }
    this.pet.x = this.player.x - 26;
    this.pet.y = this.player.y + 8;

    this.updateFogOfWar();
  }

  public setInputVector(x: number, y: number) {
    this.inputVector = { x, y };
  }

  public update(dt: number) {
    this.gameTime += dt;

    // Day/Night Cycle
    const dayProgressPerSec = 1 / (DAY_CYCLE_MS / 1000);
    this.timeOfDay = (this.timeOfDay + dt * dayProgressPerSec) % 1;
    if (this.onTimeChange) {
      this.onTimeChange(this.timeOfDay);
    }

    // Player action animation timer decay
    if (this.player.actionTimer > 0) {
      this.player.actionTimer = Math.max(0, this.player.actionTimer - dt * 4);
    }

    // Process Movement
    this.updateMovement(dt);

    // Process Pet following movement
    this.updatePet(dt);

    // Camera follow player smoothly
    const lerpFactor = Math.min(1, dt * 8);
    this.camera.x += (this.player.x - this.camera.x) * lerpFactor;
    this.camera.y += (this.player.y - this.camera.y) * lerpFactor;

    // Update Fog of War
    this.updateFogOfWar();

    // Check target interactable node
    this.checkTargetNode();

    // Update Resources respawn
    this.updateResourceRespawns();

    // Update Particles
    this.updateParticles(dt);

    // Update Smoke for placed buildings
    this.updateSmoke(dt);

    // Update Floating texts
    this.updateFloatingTexts();

    // Periodic auto-save every 6 seconds
    const now = performance.now();
    if (now - this.lastSaveTime > 6000) {
      this.lastSaveTime = now;
      this.persistSave();
    }
  }

  private updateMovement(dt: number) {
    const { x: ix, y: iy } = this.inputVector;
    const len = Math.hypot(ix, iy);

    if (len > 0.1) {
      const speed = PLAYER_SPEED * Math.min(1, len);
      const nx = (ix / len) * speed * dt;
      const ny = (iy / len) * speed * dt;

      // Update facing direction
      if (Math.abs(ix) > Math.abs(iy)) {
        this.player.direction = ix > 0 ? 'RIGHT' : 'LEFT';
      } else {
        this.player.direction = iy > 0 ? 'DOWN' : 'UP';
      }

      this.player.isMoving = true;

      // Attempt movement with horizontal and vertical axis sliding
      const targetX = this.player.x + nx;
      const targetY = this.player.y + ny;

      if (!this.checkCollision(targetX, this.player.y)) {
        this.player.x = targetX;
      }
      if (!this.checkCollision(this.player.x, targetY)) {
        this.player.y = targetY;
      }

      // Footstep sound
      this.footstepTimer += dt;
      if (this.footstepTimer > 0.32) {
        this.footstepTimer = 0;
        soundSystem.playFootstep();
      }
    } else {
      this.player.isMoving = false;
    }
  }

  private checkCollision(worldX: number, worldY: number): boolean {
    const radius = 10; // player collision radius
    const checkPoints = [
      { x: worldX - radius, y: worldY + 10 },
      { x: worldX + radius, y: worldY + 10 },
      { x: worldX, y: worldY + 14 },
      { x: worldX, y: worldY + 4 },
    ];

    for (const pt of checkPoints) {
      const tx = Math.floor(pt.x / TILE_SIZE);
      const ty = Math.floor(pt.y / TILE_SIZE);

      // Bounds
      if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) {
        return true;
      }

      const tile = this.map.tiles[ty][tx];
      // Water and hill rocks block movement
      if (tile === 'DEEP_WATER' || tile === 'WATER' || tile === 'SHALLOW_WATER' || tile === 'HILL_ROCK') {
        return true;
      }

      // Check collision with placed buildings
      for (const b of this.placedBuildings) {
        const def = BUILDINGS[b.type];
        if (def) {
          const bx1 = b.x * TILE_SIZE;
          const by1 = b.y * TILE_SIZE;
          const bx2 = bx1 + def.width * TILE_SIZE;
          const by2 = by1 + def.height * TILE_SIZE;

          // Building footprint collision
          if (pt.x >= bx1 && pt.x <= bx2 && pt.y >= by1 + 12 && pt.y <= by2) {
            return true;
          }
        }
      }
    }

    return false;
  }

  private updateFogOfWar() {
    const playerTileX = Math.floor(this.player.x / TILE_SIZE);
    const playerTileY = Math.floor(this.player.y / TILE_SIZE);
    const r = Math.ceil(VISION_RADIUS);

    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const tx = playerTileX + dx;
        const ty = playerTileY + dy;

        if (tx >= 0 && tx < MAP_WIDTH && ty >= 0 && ty < MAP_HEIGHT) {
          const dist = Math.hypot(dx, dy);
          if (dist <= VISION_RADIUS) {
            this.revealedTiles[ty][tx] = true;
          }
        }
      }
    }
  }

  private checkTargetNode() {
    const reach = 56; // pixels reach distance
    let bestDist = reach;
    let closestNode: ResourceNode | null = null;

    // Check area in front of player
    let frontOffsetX = 0;
    let frontOffsetY = 0;
    if (this.player.direction === 'UP') frontOffsetY = -20;
    if (this.player.direction === 'DOWN') frontOffsetY = 20;
    if (this.player.direction === 'LEFT') frontOffsetX = -20;
    if (this.player.direction === 'RIGHT') frontOffsetX = 20;

    const checkX = this.player.x + frontOffsetX;
    const checkY = this.player.y + frontOffsetY;

    for (const res of this.map.resources) {
      if (!res.available) continue;
      const resX = res.x * TILE_SIZE + TILE_SIZE / 2;
      const resY = res.y * TILE_SIZE + TILE_SIZE / 2;
      const dist = Math.hypot(checkX - resX, checkY - resY);

      if (dist < bestDist) {
        bestDist = dist;
        closestNode = res;
      }
    }

    if (this.currentTargetNode !== closestNode) {
      this.currentTargetNode = closestNode;
      if (this.onTargetNodeChange) {
        this.onTargetNodeChange(closestNode);
      }
    }

    // Check nearby NPC for dialogue interaction
    let closestNpc: NPCEntity | null = null;
    let bestNpcDist = 65;
    if (this.map.npcs) {
      for (const npc of this.map.npcs) {
        const dist = Math.hypot(this.player.x - npc.x, this.player.y - npc.y);
        if (dist < bestNpcDist) {
          bestNpcDist = dist;
          closestNpc = npc;
        }
      }
    }

    if (this.targetNpc !== closestNpc) {
      this.targetNpc = closestNpc;
      if (this.onTargetNpcChange) {
        this.onTargetNpcChange(closestNpc);
      }
    }
  }

  public talkToNpc(npc: NPCEntity) {
    soundSystem.unlock();
    soundSystem.playClick();

    if (!this.talkedToNpcIds.includes(npc.id)) {
      this.talkedToNpcIds.push(npc.id);
    }

    if (npc.associatedSecretId && !this.discoveredSecretIds.includes(npc.associatedSecretId)) {
      this.discoveredSecretIds.push(npc.associatedSecretId);
      this.addFloatingText(npc.x, npc.y - 28, '📖 Zabilježeno u Dnevnik!', '#38bdf8');
      if (this.onSecretDiscovered) {
        this.onSecretDiscovered(npc.associatedSecretId);
      }
    }

    if (this.onOpenDialogue) {
      this.onOpenDialogue(npc);
    }
    this.persistSave();
  }

  // Action button pressed (talk to NPC / harvest / collect)
  public performAction(): boolean {
    soundSystem.unlock();

    // If in placement mode, confirm placement
    if (this.placementMode && this.placementMode.active) {
      return this.confirmPlacement();
    }

    // If standing near an NPC, talk to them!
    if (this.targetNpc) {
      this.talkToNpc(this.targetNpc);
      return true;
    }

    if (!this.currentTargetNode || !this.currentTargetNode.available) {
      // Check if player is near pet to pet it!
      if (this.petThePet()) {
        return true;
      }

      // Gentle air swing
      this.player.actionTimer = 1.0;
      soundSystem.playFootstep();
      return false;
    }

    const node = this.currentTargetNode;
    this.player.actionTimer = 1.0;
    this.player.actionType = node.type;

    // Play appropriate sound & update inventory
    const info = RESOURCE_INFO[node.type];
    const resX = node.x * TILE_SIZE + TILE_SIZE / 2;
    const resY = node.y * TILE_SIZE + TILE_SIZE / 2;

    switch (node.type) {
      case 'WOOD':
        soundSystem.playChop();
        this.inventory.wood += 1;
        this.spawnParticles(resX, resY - 8, '#6d4c33', 8);
        this.spawnParticles(resX, resY - 14, '#659c58', 6);
        break;

      case 'STONE':
        soundSystem.playMine();
        this.inventory.stone += 1;
        this.spawnParticles(resX, resY, '#94a3b8', 8);
        this.spawnParticles(resX, resY, '#cbd5e1', 5);
        break;

      case 'FIBRE':
        soundSystem.playFibre();
        this.inventory.fibre += 1;
        this.spawnParticles(resX, resY, '#a855f7', 6);
        this.spawnParticles(resX, resY, '#22c55e', 6);
        break;

      case 'SHELL':
        soundSystem.playShell();
        this.inventory.shells += 1;
        this.spawnParticles(resX, resY, '#f472b6', 6);
        break;

      case 'SAND_PILE':
        soundSystem.playShell();
        this.inventory.sand += 1;
        this.spawnParticles(resX, resY, '#fde047', 8);
        break;
    }

    // Floating text indicator
    this.addFloatingText(resX, resY - 16, info.unitName, info.color);

    // Set node unavailable and schedule respawn
    node.available = false;
    node.respawnTime = Date.now() + RESOURCE_RESPAWN_MS;

    if (this.onInventoryChange) {
      this.onInventoryChange({ ...this.inventory });
    }

    this.checkTargetNode();
    this.persistSave();
    return true;
  }

  // Building Placement Flow
  public startPlacement(type: BuildingType) {
    soundSystem.unlock();
    soundSystem.playClick();

    // Place building in front of player
    let offsetTileX = 0;
    let offsetTileY = 0;
    if (this.player.direction === 'UP') offsetTileY = -2;
    if (this.player.direction === 'DOWN') offsetTileY = 1;
    if (this.player.direction === 'LEFT') offsetTileX = -2;
    if (this.player.direction === 'RIGHT') offsetTileX = 1;

    const baseTileX = Math.max(1, Math.min(MAP_WIDTH - 4, Math.floor(this.player.x / TILE_SIZE) + offsetTileX));
    const baseTileY = Math.max(1, Math.min(MAP_HEIGHT - 4, Math.floor(this.player.y / TILE_SIZE) + offsetTileY));

    const isValid = this.isPlacementValid(type, baseTileX, baseTileY);

    this.placementMode = {
      active: true,
      buildingType: type,
      tileX: baseTileX,
      tileY: baseTileY,
      isValid,
    };
  }

  public movePlacementCursor(dx: number, dy: number) {
    if (!this.placementMode || !this.placementMode.active) return;
    const def = BUILDINGS[this.placementMode.buildingType];
    if (!def) return;

    const nx = Math.max(1, Math.min(MAP_WIDTH - def.width - 1, this.placementMode.tileX + dx));
    const ny = Math.max(1, Math.min(MAP_HEIGHT - def.height - 1, this.placementMode.tileY + dy));

    this.placementMode.tileX = nx;
    this.placementMode.tileY = ny;
    this.placementMode.isValid = this.isPlacementValid(this.placementMode.buildingType, nx, ny);
    soundSystem.playFootstep();
  }

  public setPlacementPosition(tileX: number, tileY: number) {
    if (!this.placementMode || !this.placementMode.active) return;
    const def = BUILDINGS[this.placementMode.buildingType];
    if (!def) return;

    const nx = Math.max(1, Math.min(MAP_WIDTH - def.width - 1, tileX));
    const ny = Math.max(1, Math.min(MAP_HEIGHT - def.height - 1, tileY));

    this.placementMode.tileX = nx;
    this.placementMode.tileY = ny;
    this.placementMode.isValid = this.isPlacementValid(this.placementMode.buildingType, nx, ny);
  }

  public isPlacementValid(type: BuildingType, tx: number, ty: number): boolean {
    const def = BUILDINGS[type];
    if (!def) return false;

    // Check affordability
    if (!this.canAfford(type)) return false;

    // Check ground tiles
    for (let y = ty; y < ty + def.height; y++) {
      for (let x = tx; x < tx + def.width; x++) {
        if (x < 0 || x >= MAP_WIDTH || y < 0 || y >= MAP_HEIGHT) {
          return false;
        }

        const tile = this.map.tiles[y][x];
        // Must be on allowed ground (e.g. GRASS / SAND)
        if (!def.allowedGround.includes(tile)) {
          return false;
        }

        // Cannot place on water or cliff rocks
        if (tile === 'WATER' || tile === 'DEEP_WATER' || tile === 'SHALLOW_WATER' || tile === 'HILL_ROCK') {
          return false;
        }

        // Must not conflict with existing placed buildings
        for (const b of this.placedBuildings) {
          const bDef = BUILDINGS[b.type];
          if (bDef) {
            if (
              x >= b.x &&
              x < b.x + bDef.width &&
              y >= b.y &&
              y < b.y + bDef.height
            ) {
              return false;
            }
          }
        }

        // Must not overlap any resource nodes
        for (const res of this.map.resources) {
          if (res.x === x && res.y === y) {
            return false;
          }
        }

        // Cannot place right over player
        const pxTile = Math.floor(this.player.x / TILE_SIZE);
        const pyTile = Math.floor(this.player.y / TILE_SIZE);
        if (x === pxTile && y === pyTile) {
          return false;
        }
      }
    }

    return true;
  }

  public canAfford(type: BuildingType): boolean {
    const def = BUILDINGS[type];
    if (!def) return false;
    const cost = def.cost;

    if (cost.wood && this.inventory.wood < cost.wood) return false;
    if (cost.stone && this.inventory.stone < cost.stone) return false;
    if (cost.fibre && this.inventory.fibre < cost.fibre) return false;
    if (cost.shells && this.inventory.shells < cost.shells) return false;
    if (cost.sand && this.inventory.sand < cost.sand) return false;

    return true;
  }

  public confirmPlacement(): boolean {
    if (!this.placementMode || !this.placementMode.active) return false;
    const { buildingType, tileX, tileY } = this.placementMode;

    if (!this.isPlacementValid(buildingType, tileX, tileY)) {
      return false;
    }

    const def = BUILDINGS[buildingType];
    if (!def) return false;

    // Deduct cost
    if (def.cost.wood) this.inventory.wood -= def.cost.wood;
    if (def.cost.stone) this.inventory.stone -= def.cost.stone;
    if (def.cost.fibre) this.inventory.fibre -= def.cost.fibre;
    if (def.cost.shells) this.inventory.shells -= def.cost.shells;
    if (def.cost.sand) this.inventory.sand -= def.cost.sand;

    // Add placed building
    this.placedBuildings.push({
      id: `building_${Date.now()}`,
      type: buildingType,
      x: tileX,
      y: tileY,
      placedAt: Date.now(),
    });

    // Sound and particles
    soundSystem.playBuild();
    const cx = (tileX + def.width / 2) * TILE_SIZE;
    const cy = (tileY + def.height / 2) * TILE_SIZE;
    this.spawnParticles(cx, cy, '#cbd5e1', 14);
    this.spawnParticles(cx, cy, '#eab308', 10);
    this.addFloatingText(cx, cy - 20, `Sagrađeno: ${def.name}`, '#f59e0b');

    // Reset placement mode
    this.placementMode = null;

    if (this.onInventoryChange) {
      this.onInventoryChange({ ...this.inventory });
    }

    this.persistSave();
    return true;
  }

  public cancelPlacement() {
    soundSystem.playClick();
    this.placementMode = null;
  }

  private updateResourceRespawns() {
    const now = Date.now();
    for (const res of this.map.resources) {
      if (!res.available && res.respawnTime && now >= res.respawnTime) {
        res.available = true;
        res.respawnTime = undefined;
        // Sprout particle
        const rx = res.x * TILE_SIZE + TILE_SIZE / 2;
        const ry = res.y * TILE_SIZE + TILE_SIZE / 2;
        this.spawnParticles(rx, ry, '#4ade80', 5);
      }
    }
  }

  private updateSmoke(dt: number) {
    this.smokeSpawnTimer += dt;
    if (this.smokeSpawnTimer > 0.8) {
      this.smokeSpawnTimer = 0;
      this.placedBuildings.forEach((b) => {
        // Chimney positions for buildings
        let cx = (b.x + 0.4) * TILE_SIZE;
        let cy = (b.y + 0.1) * TILE_SIZE;
        if (b.type === 'STONE_HOUSE') {
          cx = (b.x + 1.6) * TILE_SIZE;
        }

        this.smokeParticles.push({
          x: cx + (Math.random() * 4 - 2),
          y: cy,
          vx: Math.random() * 6 - 3,
          vy: -14 - Math.random() * 6,
          size: 3 + Math.random() * 2,
          alpha: 0.5,
          maxAlpha: 0.5,
          life: 2.2,
          maxLife: 2.2,
        });
      });
    }

    for (let i = this.smokeParticles.length - 1; i >= 0; i--) {
      const s = this.smokeParticles[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.life <= 0) {
        this.smokeParticles.splice(i, 1);
      }
    }
  }

  private spawnParticles(x: number, y: number, color: string, count: number = 6) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 25 + Math.random() * 45;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        size: 2.5 + Math.random() * 2,
        life: 0.5 + Math.random() * 0.4,
        maxLife: 0.9,
      });
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private addFloatingText(x: number, y: number, text: string, color: string) {
    this.floatingTexts.push({
      id: `ft_${Date.now()}_${Math.random()}`,
      x,
      y,
      text,
      color,
      createdAt: performance.now(),
      duration: 1200,
    });
  }

  private updateFloatingTexts() {
    const now = performance.now();
    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      if (now - this.floatingTexts[i].createdAt > this.floatingTexts[i].duration) {
        this.floatingTexts.splice(i, 1);
      }
    }
  }

  private updatePet(dt: number) {
    if (this.pet.happyTimer > 0) {
      this.pet.happyTimer = Math.max(0, this.pet.happyTimer - dt);
    }

    const dx = this.player.x - this.pet.x;
    const dy = this.player.y - this.pet.y;
    const dist = Math.hypot(dx, dy);

    // Follow target offset slightly behind player
    const stopDist = 34;
    const maxFollowSpeed = PLAYER_SPEED * 1.05;

    if (dist > stopDist) {
      const speed = dist > 140 ? maxFollowSpeed * 1.6 : maxFollowSpeed * (dist / 70);
      const moveX = (dx / dist) * speed * dt;
      const moveY = (dy / dist) * speed * dt;

      this.pet.x += moveX;
      this.pet.y += moveY;
      this.pet.direction = dx > 0 ? 'RIGHT' : 'LEFT';
      this.pet.isMoving = true;
    } else {
      this.pet.isMoving = false;
    }
  }

  public petThePet(): boolean {
    const dist = Math.hypot(this.player.x - this.pet.x, this.player.y - this.pet.y);
    if (dist > 54) return false;

    this.pet.happyTimer = 1.2;
    soundSystem.playPetSound(this.pet.type);
    this.addFloatingText(this.pet.x, this.pet.y - 18, `❤️ ${this.pet.name}`, '#f43f5e');
    this.spawnParticles(this.pet.x, this.pet.y - 6, '#f43f5e', 7);
    this.spawnParticles(this.pet.x, this.pet.y - 10, '#fb7185', 5);
    return true;
  }

  public persistSave() {
    const harvested = this.map.resources
      .filter((r) => !r.available && r.respawnTime)
      .map((r) => ({ id: r.id, respawnTime: r.respawnTime! }));

    const data: GameSaveState = {
      version: 1,
      worldId: this.worldId,
      worldName: this.worldName,
      seed: this.seed,
      createdAt: this.createdAt,
      lastPlayedAt: Date.now(),
      character: { ...this.character },
      pet: {
        type: this.pet.type,
        name: this.pet.name,
      },
      player: {
        x: Math.round(this.player.x),
        y: Math.round(this.player.y),
        direction: this.player.direction,
      },
      inventory: { ...this.inventory },
      revealedTiles: this.revealedTiles,
      placedBuildings: [...this.placedBuildings],
      harvestedNodeIds: harvested,
      timeOfDay: this.timeOfDay,
      hasSeenIntro: this.hasSeenIntro,
      discoveredSecretIds: [...this.discoveredSecretIds],
      talkedToNpcIds: [...this.talkedToNpcIds],
    };

    saveWorld(data);
  }

  public switchWorld(targetWorldId: string) {
    this.persistSave();
    const saved = loadWorld(targetWorldId);
    if (!saved) return;

    this.worldId = saved.worldId || targetWorldId;
    this.worldName = saved.worldName || 'Otok Magle';
    this.seed = saved.seed || 42;
    this.createdAt = saved.createdAt || Date.now();
    this.hasSeenIntro = saved.hasSeenIntro ?? true;
    this.discoveredSecretIds = saved.discoveredSecretIds || [];
    this.talkedToNpcIds = saved.talkedToNpcIds || [];

    if (saved.character) {
      this.character = { ...saved.character };
    }
    if (saved.pet) {
      this.pet.type = saved.pet.type;
      this.pet.name = saved.pet.name;
    }

    this.map = generateIslandMap(this.seed);
    this.player = {
      x: saved.player?.x ?? this.map.initialPlayerPos.x,
      y: saved.player?.y ?? this.map.initialPlayerPos.y,
      vx: 0,
      vy: 0,
      direction: saved.player?.direction || 'DOWN',
      isMoving: false,
      actionTimer: 0,
    };
    this.pet.x = this.player.x - 26;
    this.pet.y = this.player.y + 8;
    this.pet.happyTimer = 0;

    this.camera = { x: this.player.x, y: this.player.y };
    this.inventory = { ...saved.inventory };
    this.revealedTiles = saved.revealedTiles || Array.from({ length: MAP_HEIGHT }, () => Array.from({ length: MAP_WIDTH }, () => false));
    this.placedBuildings = saved.placedBuildings || [];
    this.floatingTexts = [];
    this.particles = [];
    this.smokeParticles = [];
    this.timeOfDay = saved.timeOfDay ?? 0.25;
    this.placementMode = null;

    if (saved.harvestedNodeIds) {
      const now = Date.now();
      saved.harvestedNodeIds.forEach((h) => {
        const node = this.map.resources.find((r) => r.id === h.id);
        if (node && h.respawnTime > now) {
          node.available = false;
          node.respawnTime = h.respawnTime;
        }
      });
    }

    const isWater = (wx: number, wy: number) => {
      const tx = Math.floor(wx / TILE_SIZE);
      const ty = Math.floor(wy / TILE_SIZE);
      if (tx < 0 || tx >= MAP_WIDTH || ty < 0 || ty >= MAP_HEIGHT) return true;
      const t = this.map.tiles[ty][tx];
      return t === 'DEEP_WATER' || t === 'WATER' || t === 'SHALLOW_WATER';
    };

    if (isWater(this.player.x, this.player.y) || this.checkCollision(this.player.x, this.player.y)) {
      this.player.x = this.map.initialPlayerPos.x;
      this.player.y = this.map.initialPlayerPos.y;
      this.camera.x = this.player.x;
      this.camera.y = this.player.y;
      this.pet.x = this.player.x - 26;
      this.pet.y = this.player.y + 8;
    }

    this.updateFogOfWar();
    if (this.onInventoryChange) {
      this.onInventoryChange({ ...this.inventory });
    }
  }

  public startNewGame() {
    soundSystem.playClick();
    const seed = Math.floor(Math.random() * 99999) + 1;
    this.map = generateIslandMap(seed);
    this.seed = seed;
    this.worldId = 'world_' + Date.now();
    this.worldName = 'Otok Magle';
    this.createdAt = Date.now();
    this.hasSeenIntro = false;
    this.discoveredSecretIds = [];
    this.talkedToNpcIds = [];

    this.player = {
      x: this.map.initialPlayerPos.x,
      y: this.map.initialPlayerPos.y,
      vx: 0,
      vy: 0,
      direction: 'DOWN',
      isMoving: false,
      actionTimer: 0,
    };
    this.inventory = {
      wood: 0,
      stone: 0,
      fibre: 0,
      shells: 0,
      sand: 0,
    };
    this.revealedTiles = Array.from({ length: MAP_HEIGHT }, () =>
      Array.from({ length: MAP_WIDTH }, () => false)
    );
    this.placedBuildings = [];
    this.floatingTexts = [];
    this.particles = [];
    this.smokeParticles = [];
    this.timeOfDay = 0.25;
    this.placementMode = null;
    this.camera = { x: this.player.x, y: this.player.y };

    this.updateFogOfWar();
    this.persistSave();

    if (this.onInventoryChange) {
      this.onInventoryChange({ ...this.inventory });
    }
  }
}
