import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, BUILDINGS } from './constants';
import { GameMap } from './mapGenerator';
import {
  PlayerState,
  PlacedBuilding,
  FloatingText,
  Particle,
  SmokeParticle,
  BuildingType,
  CharacterCustomization,
  PetState,
  NPCEntity,
} from './types';

export interface RenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  map: GameMap;
  player: PlayerState;
  character: CharacterCustomization;
  pet: PetState;
  revealedTiles: boolean[][];
  placedBuildings: PlacedBuilding[];
  floatingTexts: FloatingText[];
  particles: Particle[];
  smokeParticles: SmokeParticle[];
  timeOfDay: number; // 0 to 1
  gameTime: number; // in seconds
  placementMode: {
    active: boolean;
    buildingType: BuildingType;
    tileX: number;
    tileY: number;
    isValid: boolean;
  } | null;
  camera: {
    x: number;
    y: number;
  };
  zoom?: number;
}

export class GameRenderer {
  public render(rc: RenderContext) {
    const { canvas, ctx, camera, map } = rc;
    const width = canvas.width;
    const height = canvas.height;

    ctx.save();
    // Deep crystal ocean base background
    ctx.fillStyle = '#0a1d33';
    ctx.fillRect(0, 0, width, height);

    // Device Pixel Ratio & camera zoom factor (closer view for mobile)
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const zoomFactor = rc.zoom || 1.5;
    const scale = dpr * zoomFactor;

    // Visible tile bounds in world units
    const halfWorldW = width / (2 * scale);
    const halfWorldH = height / (2 * scale);

    const leftTile = Math.max(0, Math.floor((camera.x - halfWorldW) / TILE_SIZE) - 2);
    const rightTile = Math.min(MAP_WIDTH - 1, Math.ceil((camera.x + halfWorldW) / TILE_SIZE) + 2);
    const topTile = Math.max(0, Math.floor((camera.y - halfWorldH) / TILE_SIZE) - 2);
    const bottomTile = Math.min(MAP_HEIGHT - 1, Math.ceil((camera.y + halfWorldH) / TILE_SIZE) + 2);

    // Enter world space transformation
    ctx.save();
    ctx.translate(Math.floor(width / 2), Math.floor(height / 2));
    ctx.scale(scale, scale);
    ctx.translate(-camera.x, -camera.y);

    // 1. Natural Island Terrain (Deeper mystical oceanic blue sea, weathered sand, mossy grass)
    this.renderNaturalTerrain(ctx, map, leftTile, rightTile, topTile, bottomTile, rc.revealedTiles);

    // 2. Calm Water Ripples & Sea Life
    this.renderWaterAndSeaLife(ctx, map, leftTile, rightTile, topTile, bottomTile, rc.gameTime, rc.revealedTiles);

    // 3. Shoreline Mist (Coastal fog creeping gently over the water edges)
    this.renderShorelineMist(ctx, map, leftTile, rightTile, topTile, bottomTile, rc.gameTime, rc.revealedTiles);

    // 4. Y-Sorted Entities (Resources, Buildings, NPCs, Pet, Player)
    interface RenderEntity {
      yOrder: number;
      draw: () => void;
    }
    const entities: RenderEntity[] = [];

    // Natural Organic Resources (Lush Trees, Weathered Boulders, Lavender, Shells)
    map.resources.forEach((res) => {
      if (res.x >= leftTile && res.x <= rightTile && res.y >= topTile && res.y <= bottomTile) {
        const isRevealed = rc.revealedTiles[res.y] && rc.revealedTiles[res.y][res.x];
        if (isRevealed) {
          entities.push({
            yOrder: (res.y + 0.9) * TILE_SIZE,
            draw: () => this.renderNaturalResource(ctx, res, rc.gameTime),
          });
        }
      }
    });

    // Placed Buildings
    rc.placedBuildings.forEach((b) => {
      const def = BUILDINGS[b.type];
      if (def) {
        entities.push({
          yOrder: (b.y + def.height - 0.1) * TILE_SIZE,
          draw: () => this.renderBuilding(ctx, b, def, rc.timeOfDay, rc.gameTime),
        });
      }
    });

    // NPC Villagers (Starac Goran, Ribar Mate, Travarica Mara)
    if (map.npcs) {
      map.npcs.forEach((npc) => {
        if (npc.tileX >= leftTile && npc.tileX <= rightTile && npc.tileY >= topTile && npc.tileY <= bottomTile) {
          const isRevealed = rc.revealedTiles[npc.tileY] && rc.revealedTiles[npc.tileY][npc.tileX];
          if (isRevealed) {
            entities.push({
              yOrder: npc.y + 14,
              draw: () => this.renderNPC(ctx, npc, rc.gameTime, rc.player),
            });
          }
        }
      });
    }

    // Pet Companion
    if (rc.pet) {
      entities.push({
        yOrder: rc.pet.y + 8,
        draw: () => this.renderPet(ctx, rc.pet, rc.gameTime),
      });
    }

    // Player
    entities.push({
      yOrder: rc.player.y + 16,
      draw: () => this.renderPlayer(ctx, rc.player, rc.character, rc.gameTime),
    });

    // Placement ghost (if active)
    if (rc.placementMode && rc.placementMode.active) {
      const pm = rc.placementMode;
      const def = BUILDINGS[pm.buildingType];
      if (def) {
        entities.push({
          yOrder: (pm.tileY + def.height + 0.1) * TILE_SIZE,
          draw: () => this.renderPlacementGhost(ctx, pm.tileX, pm.tileY, def, pm.isValid),
        });
      }
    }

    // Sort by yOrder for correct 2.5D depth
    entities.sort((a, b) => a.yOrder - b.yOrder);
    entities.forEach((e) => e.draw());

    // 6. Night Sea Whips (Magical whips rising periodically from the sea at night - visual only atmosphere)
    this.renderNightSeaWhips(ctx, map, leftTile, rightTile, topTile, bottomTile, rc.gameTime, rc.timeOfDay, rc.revealedTiles);

    // 7. Particles & Smoke
    this.renderParticles(ctx, rc.particles);
    this.renderSmokeParticles(ctx, rc.smokeParticles);

    // 8. Ambient Atmospheric Fluff
    this.renderAtmosphericFluff(ctx, rc, leftTile, rightTile, topTile, bottomTile);

    // 9. Floating texts
    this.renderFloatingTexts(ctx, rc.floatingTexts);

    // 10. Fog of War
    this.renderFogOfWar(ctx, rc, leftTile, rightTile, topTile, bottomTile);

    // Exit world transform space
    ctx.restore();

    // 11. Day / Sunset / Night ambient lighting tone & atmospheric dark blue night tint
    this.renderAmbientLighting(ctx, rc);

    // Exit outer canvas state
    ctx.restore();
  }

  // --- CLEAN NATURAL ISLAND TERRAIN (Uniform Deep Blue Water, Clean Beach Sand, Clean Grass) ---
  private renderNaturalTerrain(
    ctx: CanvasRenderingContext2D,
    map: GameMap,
    leftTile: number,
    rightTile: number,
    topTile: number,
    bottomTile: number,
    revealedTiles: boolean[][]
  ) {
    const isWater = (t: string) => t === 'DEEP_WATER' || t === 'WATER' || t === 'SHALLOW_WATER';

    // Layer 1: Unified Deep Mediterranean Blue Sea (NO bright light-cyan ring)
    for (let ty = topTile; ty <= bottomTile; ty++) {
      for (let tx = leftTile; tx <= rightTile; tx++) {
        if (!revealedTiles[ty] || !revealedTiles[ty][tx]) {
          ctx.fillStyle = '#081628';
          ctx.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          continue;
        }

        const type = map.tiles[ty][tx];
        const x = tx * TILE_SIZE;
        const y = ty * TILE_SIZE;

        // Unified, elegant, calm deep blue water throughout with misty oceanic tone
        if (type === 'DEEP_WATER') {
          ctx.fillStyle = '#091b30';
        } else if (type === 'WATER') {
          ctx.fillStyle = '#0e2644';
        } else if (type === 'SHALLOW_WATER') {
          ctx.fillStyle = '#133256';
        } else {
          ctx.fillStyle = '#133256';
        }
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      }
    }

    // Layer 2: Clean Weathered Beach Sand (NO darker wet sand border, NO extra shoreline bands)
    for (let ty = topTile; ty <= bottomTile; ty++) {
      for (let tx = leftTile; tx <= rightTile; tx++) {
        if (!revealedTiles[ty] || !revealedTiles[ty][tx]) continue;
        const type = map.tiles[ty][tx];
        const x = tx * TILE_SIZE;
        const y = ty * TILE_SIZE;

        if (type === 'SAND' || type === 'GRASS' || type === 'FOREST_GRASS' || type === 'HILL_ROCK') {
          const isWaterAbove = ty > 0 && isWater(map.tiles[ty - 1][tx]);
          const isWaterBelow = ty < MAP_HEIGHT - 1 && isWater(map.tiles[ty + 1][tx]);
          const isWaterLeft = tx > 0 && isWater(map.tiles[ty][tx - 1]);
          const isWaterRight = tx < MAP_WIDTH - 1 && isWater(map.tiles[ty][tx + 1]);

          const radTopLeft = isWaterAbove || isWaterLeft ? 16 : 0;
          const radTopRight = isWaterAbove || isWaterRight ? 16 : 0;
          const radBottomRight = isWaterBelow || isWaterRight ? 16 : 0;
          const radBottomLeft = isWaterBelow || isWaterLeft ? 16 : 0;

          // Clean, weathered, atmospheric coastal sand directly meeting the water
          ctx.fillStyle = '#e5d4aa';
          ctx.beginPath();
          ctx.roundRect(x, y, TILE_SIZE, TILE_SIZE, [
            radTopLeft,
            radTopRight,
            radBottomRight,
            radBottomLeft,
          ]);
          ctx.fill();

          // Delicate natural details on sand
          if (type === 'SAND') {
            const seed = (tx * 17 + ty * 31) % 14;
            if (seed === 3) {
              ctx.fillStyle = '#d4be8a';
              ctx.fillRect(x + 16, y + 20, 8, 2);
            } else if (seed === 7) {
              ctx.fillStyle = '#bfa571';
              ctx.beginPath();
              ctx.ellipse(x + 22, y + 24, 3, 2, 0.4, 0, Math.PI * 2);
              ctx.fill();
            } else if (seed === 11) {
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(x + 28, y + 16, 1.5, 1.5);
            }
          }
        }
      }
    }

    // Layer 3: Clean Lush Grass (NO drop shadow onto sand, NO busy scalloped fringe overhangs)
    for (let ty = topTile; ty <= bottomTile; ty++) {
      for (let tx = leftTile; tx <= rightTile; tx++) {
        if (!revealedTiles[ty] || !revealedTiles[ty][tx]) continue;
        const type = map.tiles[ty][tx];
        const x = tx * TILE_SIZE;
        const y = ty * TILE_SIZE;

        const isGrassTile = type === 'GRASS' || type === 'FOREST_GRASS' || type === 'HILL_ROCK';
        if (isGrassTile) {
          const isForest = type === 'FOREST_GRASS';
          const grassBase = isForest ? '#315d29' : '#4b853c';
          const grassHighlight = isForest ? '#3f7335' : '#5f9d4e';

          const isSandAbove = ty > 0 && map.tiles[ty - 1][tx] === 'SAND';
          const isSandBelow = ty < MAP_HEIGHT - 1 && map.tiles[ty + 1][tx] === 'SAND';
          const isSandLeft = tx > 0 && map.tiles[ty][tx - 1] === 'SAND';
          const isSandRight = tx < MAP_WIDTH - 1 && map.tiles[ty][tx + 1] === 'SAND';

          const rTL = isSandAbove || isSandLeft ? 14 : 0;
          const rTR = isSandAbove || isSandRight ? 14 : 0;
          const rBR = isSandBelow || isSandRight ? 14 : 0;
          const rBL = isSandBelow || isSandLeft ? 14 : 0;

          // Clean, smooth, lush grass surface directly on sand (no drop shadow, no scalloped tuft overhang)
          ctx.fillStyle = grassBase;
          ctx.beginPath();
          ctx.roundRect(x, y, TILE_SIZE, TILE_SIZE, [rTL, rTR, rBR, rBL]);
          ctx.fill();

          // Soft grass texture within the grass field
          const tuftSeed = (tx * 19 + ty * 37) % 7;
          if (tuftSeed === 1) {
            ctx.fillStyle = grassHighlight;
            ctx.fillRect(x + 14, y + 16, 4, 2);
            ctx.fillRect(x + 26, y + 28, 5, 2);
          } else if (tuftSeed === 3) {
            // Clover
            ctx.fillStyle = '#76c453';
            ctx.beginPath();
            ctx.arc(x + 28, y + 26, 2.5, 0, Math.PI * 2);
            ctx.arc(x + 32, y + 26, 2.5, 0, Math.PI * 2);
            ctx.arc(x + 30, y + 29, 2.5, 0, Math.PI * 2);
            ctx.fill();
          }

          // Wildflowers (poppy, chamomile, buttercup, lavender)
          const seed = (tx * 23 + ty * 47) % 18;
          if (seed === 2) {
            ctx.fillStyle = '#ef4444';
            ctx.beginPath();
            ctx.arc(x + 22, y + 24, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#0f172a';
            ctx.beginPath();
            ctx.arc(x + 22, y + 24, 1.2, 0, Math.PI * 2);
            ctx.fill();
          } else if (seed === 6) {
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x + 30, y + 18, 3.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#eab308';
            ctx.beginPath();
            ctx.arc(x + 30, y + 18, 1.5, 0, Math.PI * 2);
            ctx.fill();
          } else if (seed === 10) {
            ctx.fillStyle = '#fde047';
            ctx.beginPath();
            ctx.arc(x + 16, y + 18, 3, 0, Math.PI * 2);
            ctx.fill();
          } else if (seed === 14) {
            ctx.fillStyle = '#9333ea';
            ctx.beginPath();
            ctx.ellipse(x + 16, y + 32, 2.5, 4.5, 0.2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }

  // --- CALM WATER RIPPLES & SEA LIFE (No bright cyan, no foam strips on shoreline) ---
  private renderWaterAndSeaLife(
    ctx: CanvasRenderingContext2D,
    map: GameMap,
    leftTile: number,
    rightTile: number,
    topTile: number,
    bottomTile: number,
    gameTime: number,
    revealedTiles: boolean[][]
  ) {
    for (let ty = topTile; ty <= bottomTile; ty++) {
      for (let tx = leftTile; tx <= rightTile; tx++) {
        if (!revealedTiles[ty] || !revealedTiles[ty][tx]) continue;
        const tile = map.tiles[ty][tx];
        const x = tx * TILE_SIZE;
        const y = ty * TILE_SIZE;

        // Gentle soothing water ripples on open blue water
        if (tile === 'WATER' || tile === 'DEEP_WATER' || tile === 'SHALLOW_WATER') {
          const swell = Math.sin(gameTime * 1.5 + tx * 0.7 + ty * 0.5);
          if (swell > 0.4) {
            ctx.strokeStyle = 'rgba(74, 144, 212, 0.25)';
            ctx.lineWidth = 1.8;
            ctx.beginPath();
            ctx.arc(x + 24, y + 24, 12, -0.4, Math.PI * 0.6);
            ctx.stroke();
          }

          // Sea stars in shallow water
          if (tile === 'SHALLOW_WATER') {
            const starSeed = (tx * 19 + ty * 23) % 25;
            if (starSeed === 3) {
              ctx.fillStyle = '#f472b6';
              ctx.beginPath();
              ctx.arc(x + 16, y + 28, 3.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#fce7f3';
              ctx.fillRect(x + 15, y + 27, 2, 2);
            }

            // Playful swimming fish
            const fishSeed = (tx * 13 + ty * 29) % 18;
            if (fishSeed === 4) {
              const fishTime = (gameTime * 1.8 + tx) % 8;
              const fx = x + 8 + (fishTime * 9) % 38;
              const fy = y + 22 + Math.sin(fishTime * 4) * 3.5;

              ctx.fillStyle = '#ea580c';
              ctx.beginPath();
              ctx.ellipse(fx, fy, 4.5, 2.2, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#ffffff';
              ctx.fillRect(fx - 1, fy - 2, 1.5, 4);
              ctx.fillStyle = '#ea580c';
              ctx.beginPath();
              ctx.moveTo(fx - 4.5, fy);
              ctx.lineTo(fx - 8, fy - 2.5);
              ctx.lineTo(fx - 8, fy + 2.5);
              ctx.closePath();
              ctx.fill();
            } else if (fishSeed === 11) {
              const fishTime = (gameTime * 1.5 + ty) % 9;
              const fx = x + 10 + (fishTime * 8) % 36;
              const fy = y + 16 + Math.cos(fishTime * 3) * 3;

              ctx.fillStyle = '#0284c7';
              ctx.beginPath();
              ctx.ellipse(fx, fy, 4.5, 2.2, 0, 0, Math.PI * 2);
              ctx.fill();
              ctx.fillStyle = '#fde047';
              ctx.beginPath();
              ctx.moveTo(fx - 4.5, fy);
              ctx.lineTo(fx - 8, fy - 2.5);
              ctx.lineTo(fx - 8, fy + 2.5);
              ctx.closePath();
              ctx.fill();
            }
          }
        }
      }
    }
  }

  // --- NATURAL, FLUFFY, ORGANIC RESOURCES (Lush Trees, Weathered Boulders, Lavender, Shells) ---
  private renderNaturalResource(ctx: CanvasRenderingContext2D, res: any, gameTime: number) {
    const cx = res.x * TILE_SIZE + TILE_SIZE / 2;
    const cy = res.y * TILE_SIZE + TILE_SIZE / 2;

    if (!res.available) {
      if (res.type === 'WOOD') {
        ctx.fillStyle = 'rgba(15, 25, 35, 0.22)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 12, 11, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#8b5a2b';
        ctx.beginPath();
        ctx.roundRect(cx - 7, cy + 2, 14, 10, 3);
        ctx.fill();
        ctx.fillStyle = '#d2a679';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 2, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(cx + 3, cy - 2, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (res.type === 'STONE') {
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.ellipse(cx - 4, cy + 7, 4, 3, 0.3, 0, Math.PI * 2);
        ctx.ellipse(cx + 4, cy + 8, 5, 3.5, -0.2, 0, Math.PI * 2);
        ctx.fill();
      } else if (res.type === 'FIBRE') {
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(cx - 1, cy + 6, 3, 5);
      }
      return;
    }

    switch (res.type) {
      case 'WOOD': {
        const variant = res.variant ?? 0;
        const breeze = Math.sin(gameTime * 2.2 + res.x * 2.5) * 2;

        if (variant === 1) {
          // --- VARIANT 1: COASTAL MEDITERRANEAN DATE PALM TREE ---
          ctx.fillStyle = 'rgba(15, 30, 20, 0.28)';
          ctx.beginPath();
          ctx.ellipse(cx + 2, cy + 14, 16, 7, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#7c4a27';
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.moveTo(cx, cy + 14);
          ctx.quadraticCurveTo(cx - 6, cy - 4, cx - 1 + breeze * 0.4, cy - 22);
          ctx.stroke();

          ctx.strokeStyle = '#543015';
          ctx.lineWidth = 2;
          for (let i = 0; i < 4; i++) {
            const segY = cy + 10 - i * 8;
            ctx.beginPath();
            ctx.arc(cx - i * 0.9, segY, 3.5, 0, Math.PI);
            ctx.stroke();
          }

          const crownX = cx - 1 + breeze * 0.4;
          const crownY = cy - 22;

          ctx.fillStyle = '#713f12';
          ctx.beginPath();
          ctx.arc(crownX - 3, crownY + 2, 3, 0, Math.PI * 2);
          ctx.arc(crownX + 3, crownY + 2, 3, 0, Math.PI * 2);
          ctx.arc(crownX, crownY + 4, 2.5, 0, Math.PI * 2);
          ctx.fill();

          const fronds = [
            { angle: -Math.PI * 0.8, len: 24, curve: -8 },
            { angle: -Math.PI * 0.5, len: 26, curve: -2 },
            { angle: -Math.PI * 0.2, len: 24, curve: 8 },
            { angle: -Math.PI * 0.95, len: 20, curve: -10 },
            { angle: -Math.PI * 0.05, len: 20, curve: 10 },
          ];

          fronds.forEach((f) => {
            const endX = crownX + Math.cos(f.angle) * f.len + breeze;
            const endY = crownY + Math.sin(f.angle) * f.len * 0.6;

            ctx.strokeStyle = '#15803d';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(crownX, crownY);
            ctx.quadraticCurveTo(crownX + f.curve, crownY - 6, endX, endY);
            ctx.stroke();

            ctx.fillStyle = '#22c55e';
            ctx.beginPath();
            ctx.ellipse((crownX + endX) / 2, (crownY + endY) / 2 - 2, 8, 4, f.angle * 0.5, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#4ade80';
            ctx.beginPath();
            ctx.ellipse((crownX + endX) / 2, (crownY + endY) / 2 - 3, 6, 2.5, f.angle * 0.5, 0, Math.PI * 2);
            ctx.fill();
          });
        } else if (variant === 2) {
          // --- VARIANT 2: LUSH MEDITERRANEAN MARITIME PINE (BOR) ---
          ctx.fillStyle = 'rgba(15, 30, 20, 0.28)';
          ctx.beginPath();
          ctx.ellipse(cx, cy + 14, 18, 8, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#653a1f';
          ctx.beginPath();
          ctx.roundRect(cx - 4, cy - 14, 8, 28, 2);
          ctx.fill();
          ctx.fillStyle = '#452310';
          ctx.fillRect(cx - 2, cy - 10, 2, 22);

          const canopyY = cy - 20 + breeze * 0.6;

          ctx.fillStyle = '#1b4324';
          ctx.beginPath();
          ctx.arc(cx - 10, canopyY + 6, 12, 0, Math.PI * 2);
          ctx.arc(cx + 10, canopyY + 6, 12, 0, Math.PI * 2);
          ctx.arc(cx, canopyY + 2, 15, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#285e34';
          ctx.beginPath();
          ctx.arc(cx - 7, canopyY + 2, 10, 0, Math.PI * 2);
          ctx.arc(cx + 7, canopyY + 2, 10, 0, Math.PI * 2);
          ctx.arc(cx, canopyY - 4, 13, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#3d814c';
          ctx.beginPath();
          ctx.arc(cx, canopyY - 10, 9, 0, Math.PI * 2);
          ctx.arc(cx - 4, canopyY - 6, 8, 0, Math.PI * 2);
          ctx.arc(cx + 4, canopyY - 6, 8, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#78350f';
          ctx.beginPath();
          ctx.ellipse(cx - 8, canopyY + 8, 2.5, 4, 0.2, 0, Math.PI * 2);
          ctx.ellipse(cx + 8, canopyY + 8, 2.5, 4, -0.2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // --- VARIANT 0: LUSH FLUFFY MEDITERRANEAN OLIVE / OAK TREE ---
          ctx.fillStyle = 'rgba(15, 30, 20, 0.28)';
          ctx.beginPath();
          ctx.ellipse(cx, cy + 14, 18, 9, 0, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#5c3e29';
          ctx.beginPath();
          ctx.moveTo(cx - 6, cy + 14);
          ctx.quadraticCurveTo(cx - 2, cy + 2, cx - 4, cy - 8);
          ctx.lineTo(cx + 4, cy - 8);
          ctx.quadraticCurveTo(cx + 3, cy + 2, cx + 7, cy + 14);
          ctx.closePath();
          ctx.fill();

          ctx.strokeStyle = '#3e2617';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.moveTo(cx - 2, cy + 12);
          ctx.lineTo(cx - 1, cy - 4);
          ctx.stroke();

          const canopyY = cy - 16 + breeze;

          ctx.fillStyle = '#275824';
          ctx.beginPath();
          ctx.arc(cx - 10, canopyY + 5, 14, 0, Math.PI * 2);
          ctx.arc(cx + 10, canopyY + 5, 14, 0, Math.PI * 2);
          ctx.arc(cx, canopyY - 5, 16, 0, Math.PI * 2);
          ctx.arc(cx - 4, canopyY - 12, 13, 0, Math.PI * 2);
          ctx.arc(cx + 5, canopyY - 12, 13, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#488c37';
          ctx.beginPath();
          ctx.arc(cx - 8, canopyY + 3, 12, 0, Math.PI * 2);
          ctx.arc(cx + 8, canopyY + 3, 12, 0, Math.PI * 2);
          ctx.arc(cx, canopyY - 6, 14, 0, Math.PI * 2);
          ctx.arc(cx - 3, canopyY - 12, 11, 0, Math.PI * 2);
          ctx.arc(cx + 4, canopyY - 12, 11, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#71be5a';
          ctx.beginPath();
          ctx.arc(cx - 5, canopyY - 14, 8, 0, Math.PI * 2);
          ctx.arc(cx + 4, canopyY - 14, 8, 0, Math.PI * 2);
          ctx.arc(cx - 2, canopyY - 8, 7, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = '#0f172a';
          ctx.beginPath();
          ctx.arc(cx - 7, canopyY + 6, 2.5, 0, Math.PI * 2);
          ctx.arc(cx + 8, canopyY + 8, 2.5, 0, Math.PI * 2);
          ctx.arc(cx + 1, canopyY + 2, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'STONE': {
        // Natural, Weathered, Rounded Karst River/Beach Boulder
        ctx.fillStyle = 'rgba(15, 25, 35, 0.28)';
        ctx.beginPath();
        ctx.ellipse(cx + 1, cy + 10, 15, 7.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#475569';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 2, 14, 10, 0.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.ellipse(cx - 1, cy - 1, 12.5, 8.5, 0.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#e2e8f0';
        ctx.beginPath();
        ctx.ellipse(cx - 2, cy - 4, 8, 4.5, -0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx - 4, cy - 2);
        ctx.quadraticCurveTo(cx + 1, cy + 1, cx + 5, cy);
        ctx.stroke();

        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(cx - 8, cy + 5, 3.5, 0, Math.PI * 2);
        ctx.arc(cx - 5, cy + 7, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.ellipse(cx + 9, cy + 8, 3, 2, 0.3, 0, Math.PI * 2);
        ctx.ellipse(cx - 10, cy + 9, 2.5, 1.8, -0.4, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'FIBRE': {
        const breeze = Math.sin(gameTime * 3 + res.x * 2) * 1.5;

        ctx.fillStyle = 'rgba(15, 30, 20, 0.25)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 11, 12, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#2d5a24';
        ctx.beginPath();
        ctx.arc(cx - 6, cy + 4, 9, 0, Math.PI * 2);
        ctx.arc(cx + 6, cy + 4, 9, 0, Math.PI * 2);
        ctx.arc(cx, cy - 1, 10, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#4d8c3f';
        ctx.beginPath();
        ctx.arc(cx, cy + 1, 8, 0, Math.PI * 2);
        ctx.fill();

        const spikes = [
          { ox: -7, h: 10, col: '#9333ea' },
          { ox: -2, h: 14, col: '#a855f7' },
          { ox: 3, h: 12, col: '#c084fc' },
          { ox: 8, h: 9, col: '#9333ea' },
        ];

        spikes.forEach((s) => {
          const sx = cx + s.ox + breeze * 0.6;
          const sy = cy - 2;
          ctx.fillStyle = '#15803d';
          ctx.fillRect(sx, sy - s.h, 2, s.h);

          ctx.fillStyle = s.col;
          ctx.beginPath();
          ctx.roundRect(sx - 1.5, sy - s.h - 3, 5, 7, 2);
          ctx.fill();

          ctx.fillStyle = '#f3e8ff';
          ctx.fillRect(sx, sy - s.h - 3, 2, 2);
        });
        break;
      }

      case 'SHELL': {
        ctx.fillStyle = 'rgba(60, 40, 20, 0.25)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 6, 8, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fce7f3';
        ctx.beginPath();
        ctx.arc(cx, cy + 1, 7, Math.PI, 0, false);
        ctx.lineTo(cx, cy + 5);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx, cy + 5);
        ctx.lineTo(cx - 5, cy - 3);
        ctx.moveTo(cx, cy + 5);
        ctx.lineTo(cx - 6, cy - 6);
        ctx.moveTo(cx, cy + 5);
        ctx.lineTo(cx + 5, cy - 3);
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(cx - 2, cy - 4, 2, 2);
        break;
      }

      case 'SAND_PILE': {
        ctx.fillStyle = 'rgba(60, 40, 20, 0.22)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 7, 13, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 3, 11, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.ellipse(cx - 2, cy, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
  }

  // --- BUILDINGS RENDERING ---
  private renderBuilding(
    ctx: CanvasRenderingContext2D,
    b: PlacedBuilding,
    def: any,
    timeOfDay: number,
    gameTime: number
  ) {
    const x = b.x * TILE_SIZE;
    const y = b.y * TILE_SIZE;
    const w = def.width * TILE_SIZE;
    const h = def.height * TILE_SIZE;

    const isNight = timeOfDay > 0.72 && timeOfDay < 0.98;

    ctx.fillStyle = 'rgba(15, 25, 35, 0.4)';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + h - 6, w - 8, 14, 6);
    ctx.fill();

    switch (b.type) {
      case 'HUT': {
        ctx.fillStyle = '#854d0e';
        ctx.fillRect(x + 8, y + 24, w - 16, h - 28);

        ctx.fillStyle = '#713f12';
        for (let gy = y + 36; gy < y + h - 6; gy += 10) {
          ctx.fillRect(x + 8, gy, w - 16, 2);
        }

        ctx.fillStyle = '#5c3008';
        ctx.fillRect(x + 6, y + 24, 5, h - 28);
        ctx.fillRect(x + w - 11, y + 24, 5, h - 28);

        ctx.fillStyle = '#451a03';
        ctx.beginPath();
        ctx.roundRect(x + w / 2 - 9, y + h - 34, 18, 30, 4);
        ctx.fill();
        ctx.fillStyle = '#f59e0b';
        ctx.fillRect(x + w / 2 + 4, y + h - 19, 2.5, 3);

        ctx.fillStyle = '#b4833e';
        ctx.beginPath();
        ctx.moveTo(x, y + 28);
        ctx.lineTo(x + w / 2, y);
        ctx.lineTo(x + w, y + 28);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#d4a359';
        ctx.beginPath();
        ctx.moveTo(x + 8, y + 24);
        ctx.lineTo(x + w / 2, y + 5);
        ctx.lineTo(x + w - 8, y + 24);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#64748b';
        ctx.fillRect(x + 14, y - 4, 10, 16);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x + 13, y - 6, 12, 3);

        const lanternX = x + w / 2 - 16;
        const lanternY = y + h - 26;
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(lanternX, lanternY, 4, 8);

        const glowAlpha = isNight ? 0.9 : 0.45;
        const pulse = 1 + Math.sin(gameTime * 4 + b.x) * 0.1;
        const grad = ctx.createRadialGradient(lanternX + 2, lanternY + 4, 1, lanternX + 2, lanternY + 4, 22 * pulse);
        grad.addColorStop(0, `rgba(251, 191, 36, ${glowAlpha})`);
        grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(lanternX + 2, lanternY + 4, 22 * pulse, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'STONE_HOUSE': {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(x + 6, y + 26, w - 12, h - 30);

        ctx.fillStyle = '#cbd5e1';
        for (let qy = y + 26; qy < y + h - 6; qy += 12) {
          ctx.fillRect(x + 6, qy, 6, 6);
          ctx.fillRect(x + w - 12, qy, 6, 6);
        }

        const winX = x + 16;
        const winY = y + 38;
        ctx.fillStyle = isNight ? '#fbbf24' : '#38bdf8';
        ctx.fillRect(winX, winY, 15, 15);
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(winX - 5, winY, 5, 15);
        ctx.fillRect(winX + 15, winY, 5, 15);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(winX + 7, winY, 2, 15);
        ctx.fillRect(winX, winY + 7, 15, 2);

        ctx.fillStyle = '#78350f';
        ctx.fillRect(winX - 4, winY + 15, 23, 4);
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(winX - 2, winY + 13, 3, 3);
        ctx.fillRect(winX + 5, winY + 12, 3, 3);
        ctx.fillRect(winX + 12, winY + 13, 3, 3);
        ctx.fillRect(winX + 18, winY + 12, 3, 3);

        const doorX = x + w - 32;
        const doorY = y + h - 36;
        ctx.fillStyle = '#5c3a21';
        ctx.beginPath();
        ctx.arc(doorX + 9, doorY + 6, 9, Math.PI, 0);
        ctx.lineTo(doorX + 18, doorY + 32);
        ctx.lineTo(doorX, doorY + 32);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#c2410c';
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 28);
        ctx.lineTo(x + w / 2, y + 2);
        ctx.lineTo(x + w - 2, y + 28);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#9a3412';
        ctx.lineWidth = 2;
        for (let i = 1; i <= 6; i++) {
          const rx = x + (w / 7) * i;
          ctx.beginPath();
          ctx.moveTo(rx, y + 28);
          ctx.lineTo(x + w / 2, y + 4);
          ctx.stroke();
        }

        const lanX = x + w - 10;
        const lanY = y + 42;
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(lanX, lanY, 3, 5);
        if (isNight) {
          const grad = ctx.createRadialGradient(lanX + 1, lanY + 2, 1, lanX + 1, lanY + 2, 18);
          grad.addColorStop(0, 'rgba(251, 191, 36, 0.85)');
          grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(lanX + 1, lanY + 2, 18, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'BEACH_COTTAGE': {
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(x + 12, y + h - 16, 6, 14);
        ctx.fillRect(x + w / 2 - 3, y + h - 16, 6, 14);
        ctx.fillRect(x + w - 18, y + h - 16, 6, 14);

        ctx.fillStyle = '#a16207';
        ctx.fillRect(x + 4, y + h - 18, w - 8, 6);

        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(x + 8, y + 26, w - 16, h - 42);

        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 8, y + 26, w - 16, 3);
        ctx.fillRect(x + 8, y + 26, 4, h - 42);
        ctx.fillRect(x + w - 12, y + 26, 4, h - 42);

        const w1X = x + 20;
        const w2X = x + w - 36;
        const wY = y + 36;
        [w1X, w2X].forEach((wx) => {
          ctx.fillStyle = isNight ? '#fde047' : '#e0f2fe';
          ctx.fillRect(wx, wY, 16, 14);
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(wx, wY, 16, 14);
        });

        const awningY = y + 24;
        const numStripes = 8;
        const stripeW = (w - 12) / numStripes;
        for (let i = 0; i < numStripes; i++) {
          ctx.fillStyle = i % 2 === 0 ? '#ea580c' : '#fef08a';
          ctx.fillRect(x + 6 + i * stripeW, awningY, stripeW, 10);
        }

        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.moveTo(x + 2, awningY);
        ctx.lineTo(x + w / 2, y + 4);
        ctx.lineTo(x + w - 2, awningY);
        ctx.closePath();
        ctx.fill();

        const buoyX = x + w / 2;
        const buoyY = y + 44;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(buoyX, buoyY, 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(buoyX - 6, buoyY - 1, 12, 2);
        ctx.fillStyle = '#bae6fd';
        ctx.beginPath();
        ctx.arc(buoyX, buoyY, 3, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
  }

  // --- PLAYER RENDERING ---
  private renderPlayer(
    ctx: CanvasRenderingContext2D,
    p: PlayerState,
    c: CharacterCustomization | undefined,
    gameTime: number
  ) {
    const x = p.x;
    const y = p.y;

    const skin = c?.skinColor || '#fed7aa';
    const shirt = c?.shirtColor || '#0d9488';
    const pants = c?.pantsColor || '#d4c5b9';
    const hair = c?.hairColor || '#451a03';
    const hairStyle = c?.hairStyle || 'SHORT';
    const hat = c?.hatType || 'STRAW_HAT';

    ctx.fillStyle = 'rgba(15, 25, 35, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + 16, 12, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();

    const walkCycle = p.isMoving ? Math.sin(gameTime * 12) : 0;
    const footOffset = p.isMoving ? Math.sin(gameTime * 12) * 4 : 0;
    const idleBreath = !p.isMoving ? Math.sin(gameTime * 3) * 0.8 : 0;
    const bob = Math.abs(walkCycle) * 2.5 + idleBreath;

    ctx.fillStyle = '#5c3a21';
    if (p.direction === 'LEFT' || p.direction === 'RIGHT') {
      ctx.fillRect(x - 5 + footOffset, y + 14 - bob, 5, 4);
      ctx.fillRect(x + 1 - footOffset, y + 14 - bob, 5, 4);
    } else {
      ctx.fillRect(x - 6, y + 14 + footOffset - bob, 5, 4);
      ctx.fillRect(x + 2, y + 14 - footOffset - bob, 5, 4);
    }

    ctx.fillStyle = pants;
    ctx.fillRect(x - 6, y + 6 - bob, 12, 9);

    ctx.fillStyle = shirt;
    ctx.fillRect(x - 7, y - 6 - bob, 14, 13);

    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 5 - bob);
    ctx.lineTo(x + 5, y + 5 - bob);
    ctx.stroke();

    ctx.fillStyle = '#92400e';
    ctx.fillRect(x + 4, y + 2 - bob, 5, 6);

    ctx.fillStyle = skin;
    if (p.actionTimer > 0) {
      const swingAngle = (1 - p.actionTimer) * Math.PI;
      ctx.save();
      ctx.translate(x + (p.direction === 'LEFT' ? -6 : 6), y - 2 - bob);
      ctx.rotate(p.direction === 'LEFT' ? -swingAngle : swingAngle);

      ctx.fillStyle = '#92400e';
      ctx.fillRect(-2, -14, 3, 16);

      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-6, -16, 11, 4);
      ctx.restore();
    } else {
      ctx.fillRect(x - 9, y - 2 - bob - footOffset * 0.5, 3, 6);
      ctx.fillRect(x + 6, y - 2 - bob + footOffset * 0.5, 3, 6);
    }

    const headY = y - 13 - bob;
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.arc(x, headY, 6.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#1e293b';
    if (p.direction === 'DOWN') {
      ctx.fillRect(x - 3, headY - 1, 2, 2.5);
      ctx.fillRect(x + 1, headY - 1, 2, 2.5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 3, headY - 1, 1, 1);
      ctx.fillRect(x + 1, headY - 1, 1, 1);
    } else if (p.direction === 'LEFT') {
      ctx.fillRect(x - 4, headY - 1, 2, 2.5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 4, headY - 1, 1, 1);
    } else if (p.direction === 'RIGHT') {
      ctx.fillRect(x + 2, headY - 1, 2, 2.5);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x + 2, headY - 1, 1, 1);
    }

    if (hairStyle !== 'NONE') {
      ctx.fillStyle = hair;
      if (hairStyle === 'SHORT') {
        ctx.beginPath();
        ctx.arc(x, headY - 2, 7.5, Math.PI, 0);
        ctx.lineTo(x + 7, headY);
        ctx.lineTo(x - 7, headY);
        ctx.closePath();
        ctx.fill();
      } else if (hairStyle === 'LONG') {
        ctx.beginPath();
        ctx.arc(x, headY - 2, 7.5, Math.PI, 0);
        ctx.lineTo(x + 8, headY + 8);
        ctx.lineTo(x + 5, headY + 8);
        ctx.lineTo(x + 5, headY + 1);
        ctx.lineTo(x - 5, headY + 1);
        ctx.lineTo(x - 5, headY + 8);
        ctx.lineTo(x - 8, headY + 8);
        ctx.closePath();
        ctx.fill();
      } else if (hairStyle === 'CURLY') {
        ctx.beginPath();
        ctx.arc(x - 4, headY - 4, 4.5, 0, Math.PI * 2);
        ctx.arc(x + 4, headY - 4, 4.5, 0, Math.PI * 2);
        ctx.arc(x, headY - 7, 5, 0, Math.PI * 2);
        ctx.arc(x - 6, headY, 4, 0, Math.PI * 2);
        ctx.arc(x + 6, headY, 4, 0, Math.PI * 2);
        ctx.fill();
      } else if (hairStyle === 'BAND') {
        ctx.beginPath();
        ctx.arc(x, headY - 2, 7.5, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(x - 6, headY - 3, 12, 2.5);
      }
    }

    const hatY = headY - 4;
    if (hat === 'STRAW_HAT') {
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.ellipse(x, hatY + 1, 13, 5.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.ellipse(x, hatY - 2, 8, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(x - 7, hatY - 1, 14, 2.5);
    } else if (hat === 'CAP') {
      ctx.fillStyle = '#1e3a5f';
      ctx.beginPath();
      ctx.ellipse(x, hatY - 1, 9, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(p.direction === 'LEFT' ? x - 10 : x, hatY + 1, 10, 2.5);
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(x - 1.5, hatY - 2, 3, 2);
    } else if (hat === 'FLOWER') {
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(x - 6, hatY + 1, 12, 2);
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(x - 4, hatY + 1, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(x + 3, hatY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.arc(x, hatY + 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- PET COMPANIONS RENDERING ---
  private renderPet(ctx: CanvasRenderingContext2D, pet: PetState, gameTime: number) {
    const x = pet.x;
    let y = pet.y;

    const happyBounce = pet.happyTimer > 0 ? Math.sin(pet.happyTimer * 16) * 6 : 0;
    y -= Math.max(0, happyBounce);

    const isLeft = pet.direction === 'LEFT';
    const trot = pet.isMoving ? Math.sin(gameTime * 14) : 0;

    ctx.fillStyle = 'rgba(15, 25, 35, 0.3)';
    ctx.beginPath();
    ctx.ellipse(x, pet.y + 7, pet.type === 'HAMSTER' ? 6 : 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    switch (pet.type) {
      case 'DOG': {
        const tailWag = Math.sin(gameTime * 18) * 0.55;

        ctx.save();
        ctx.translate(isLeft ? x + 7 : x - 7, y - 2);
        ctx.rotate(isLeft ? -tailWag : tailWag);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(-2, -7, 4, 7);
        ctx.fillStyle = '#fef08a';
        ctx.fillRect(-2, -9, 4, 3);
        ctx.restore();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.roundRect(x - 8, y - 4, 16, 10, 4.5);
        ctx.fill();

        ctx.fillStyle = '#d97706';
        ctx.fillRect(x - 6, y + 5 + trot * 2, 3, 4);
        ctx.fillRect(x + 3, y + 5 - trot * 2, 3, 4);

        const hx = isLeft ? x - 7 : x + 7;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(hx, y - 5, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.ellipse(isLeft ? hx + 3 : hx - 3, y - 7, 3, 5, 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(isLeft ? hx - 3.5 : hx + 1.5, y - 6, 2, 2);
        ctx.fillRect(isLeft ? hx - 6 : hx + 4, y - 4, 2.5, 2);

        ctx.fillStyle = '#ef4444';
        ctx.fillRect(isLeft ? hx - 1 : hx - 3, y - 1, 5, 2);
        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.arc(isLeft ? hx + 1 : hx - 1, y + 1, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'CAT': {
        const tailSway = Math.sin(gameTime * 6) * 0.35;

        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(isLeft ? x + 6 : x - 6, y);
        ctx.quadraticCurveTo(
          isLeft ? x + 11 + tailSway * 4 : x - 11 - tailSway * 4,
          y - 6,
          isLeft ? x + 8 : x - 8,
          y - 13
        );
        ctx.stroke();

        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.roundRect(x - 7, y - 3, 14, 9, 4.5);
        ctx.fill();

        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(isLeft ? x - 6 : x + 2, y - 1, 4, 6);

        ctx.fillStyle = '#ea580c';
        ctx.fillRect(x - 5, y + 5 + trot * 2, 2.5, 4);
        ctx.fillRect(x + 2, y + 5 - trot * 2, 2.5, 4);

        const hx = isLeft ? x - 6 : x + 6;
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(hx, y - 4, 5.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(hx - 3.5, y - 7);
        ctx.lineTo(hx - 1, y - 12);
        ctx.lineTo(hx + 1.5, y - 7);
        ctx.moveTo(hx + 1.5, y - 7);
        ctx.lineTo(hx + 4, y - 12);
        ctx.lineTo(hx + 6, y - 7);
        ctx.fill();

        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(hx - 2, y - 10, 1.5, 2.5);
        ctx.fillRect(hx + 2.5, y - 10, 1.5, 2.5);

        ctx.fillStyle = '#10b981';
        ctx.fillRect(isLeft ? hx - 3.5 : hx + 1.5, y - 5, 2, 2.5);
        break;
      }

      case 'RABBIT': {
        const hopY = pet.isMoving ? Math.abs(Math.sin(gameTime * 10)) * 6 : 0;
        const ry = y - hopY;

        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(isLeft ? x + 7 : x - 7, ry + 1, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(x - 7, ry - 3, 14, 9, 4.5);
        ctx.fill();

        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(x - 5, ry + 5, 3.5, 3);
        ctx.fillRect(x + 2, ry + 5, 3.5, 3);

        const hx = isLeft ? x - 5 : x + 5;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(hx, ry - 3, 5, 0, Math.PI * 2);
        ctx.fill();

        const earTwitch = Math.sin(gameTime * 4) * 0.15;
        ctx.save();
        ctx.translate(hx, ry - 7);
        ctx.rotate(earTwitch);
        ctx.fillStyle = '#f8fafc';
        ctx.beginPath();
        ctx.roundRect(-3, -7, 2.8, 8, 1.5);
        ctx.roundRect(1, -7, 2.8, 8, 1.5);
        ctx.fill();
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(-2, -5.5, 1.6, 5);
        ctx.fillRect(2, -5.5, 1.6, 5);
        ctx.restore();

        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(isLeft ? hx - 4.5 : hx + 3, ry - 2, 2, 1.5);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(isLeft ? hx - 2.5 : hx + 0.5, ry - 4, 2, 2);
        break;
      }

      case 'PARROT': {
        const hoverBob = Math.sin(gameTime * 8) * 3.5;
        const wingFlap = pet.isMoving ? Math.sin(gameTime * 18) * 0.55 : Math.sin(gameTime * 6) * 0.25;
        const py = y - 7 + hoverBob;

        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(isLeft ? x + 5 : x - 5, py + 2);
        ctx.lineTo(isLeft ? x + 12 : x - 12, py + 11);
        ctx.stroke();

        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.ellipse(x, py, 5.5, 7.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.save();
        ctx.translate(isLeft ? x + 1 : x - 1, py - 2);
        ctx.rotate(isLeft ? wingFlap : -wingFlap);
        ctx.fillStyle = '#0284c7';
        ctx.beginPath();
        ctx.roundRect(-2, -1, 6, 8, 2.5);
        ctx.fill();
        ctx.fillStyle = '#fde047';
        ctx.fillRect(-1, 3, 4, 2.5);
        ctx.restore();

        const hx = isLeft ? x - 4 : x + 4;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(hx, py - 5, 4.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(isLeft ? hx - 3 : hx + 3, py - 6);
        ctx.lineTo(isLeft ? hx - 7 : hx + 7, py - 4);
        ctx.lineTo(isLeft ? hx - 3 : hx + 3, py - 3);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(isLeft ? hx - 1.5 : hx, py - 6, 1.5, 1.5);
        break;
      }

      case 'HAMSTER': {
        const hy = y + 1;

        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.ellipse(x, hy, 7, 5.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(x, hy + 1, 4.5, 3.5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(x - 4, hy + 4 + trot * 1.5, 2.5, 2.5);
        ctx.fillRect(x + 1.5, hy + 4 - trot * 1.5, 2.5, 2.5);

        const hx = isLeft ? x - 5 : x + 5;
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(hx, hy - 2, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fbcfe8';
        ctx.beginPath();
        ctx.arc(isLeft ? hx - 2 : hx + 2, hy, 3, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fbcfe8';
        ctx.beginPath();
        ctx.arc(hx - 2, hy - 6, 2, 0, Math.PI * 2);
        ctx.arc(hx + 2, hy - 6, 2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#1e293b';
        ctx.fillRect(isLeft ? hx - 2.5 : hx + 0.5, hy - 3, 2, 2);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(isLeft ? hx - 4.5 : hx + 3, hy - 1, 1.5, 1.5);
        break;
      }
    }

    if (pet.happyTimer > 0) {
      const heartAlpha = Math.min(1, pet.happyTimer);
      ctx.save();
      ctx.globalAlpha = heartAlpha;
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❤️', x, y - 16 - (1 - pet.happyTimer) * 10);
      ctx.restore();
    }
  }

  // --- AMBIENT ATMOSPHERE ---
  private renderAtmosphericFluff(
    ctx: CanvasRenderingContext2D,
    rc: RenderContext,
    leftTile: number,
    rightTile: number,
    topTile: number,
    bottomTile: number
  ) {
    const isNight = rc.timeOfDay > 0.72 && rc.timeOfDay < 0.98;
    const time = rc.gameTime;

    if (!isNight) {
      const numPetals = 8;
      for (let i = 0; i < numPetals; i++) {
        const px = ((i * 157 + time * 26) % ((rightTile - leftTile) * TILE_SIZE)) + leftTile * TILE_SIZE;
        const py = ((i * 109 + Math.sin(time * 1.5 + i) * 20) % ((bottomTile - topTile) * TILE_SIZE)) + topTile * TILE_SIZE;

        ctx.fillStyle = i % 2 === 0 ? 'rgba(244, 114, 182, 0.65)' : 'rgba(254, 240, 138, 0.65)';
        ctx.beginPath();
        ctx.ellipse(px, py, 3.2, 1.6, time + i, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  // --- PLACEMENT GHOST ---
  private renderPlacementGhost(
    ctx: CanvasRenderingContext2D,
    tileX: number,
    tileY: number,
    def: any,
    isValid: boolean
  ) {
    const x = tileX * TILE_SIZE;
    const y = tileY * TILE_SIZE;
    const w = def.width * TILE_SIZE;
    const h = def.height * TILE_SIZE;

    ctx.fillStyle = isValid ? 'rgba(34, 197, 94, 0.32)' : 'rgba(239, 68, 68, 0.35)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = isValid ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);

    ctx.save();
    ctx.globalAlpha = 0.68;
    this.renderBuilding(
      ctx,
      { id: 'ghost', type: def.type, x: tileX, y: tileY, placedAt: 0 },
      def,
      0.3,
      0
    );
    ctx.restore();
  }

  // --- PARTICLES & SMOKE ---
  private renderParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
    particles.forEach((p) => {
      const alpha = p.life / p.maxLife;
      ctx.fillStyle = p.color;
      ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1;
  }

  private renderSmokeParticles(ctx: CanvasRenderingContext2D, smoke: SmokeParticle[]) {
    smoke.forEach((s) => {
      const progress = 1 - s.life / s.maxLife;
      const alpha = s.alpha * (1 - progress);
      ctx.fillStyle = `rgba(241, 245, 249, ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * (1 + progress * 1.6), 0, Math.PI * 2);
      ctx.fill();
    });
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D, texts: FloatingText[]) {
    ctx.font = '600 15px "Fredoka", "Quicksand", sans-serif';
    ctx.textAlign = 'center';

    const now = performance.now();
    texts.forEach((ft) => {
      const age = now - ft.createdAt;
      const progress = Math.min(1, age / ft.duration);
      const alpha = 1 - progress * 0.9;
      const curY = ft.y - progress * 32;

      ctx.save();
      ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.8})`;
      ctx.lineWidth = 3.5;
      ctx.strokeText(ft.text, ft.x, curY);

      ctx.fillStyle = ft.color;
      ctx.globalAlpha = alpha;
      ctx.fillText(ft.text, ft.x, curY);
      ctx.restore();
    });
  }

  private renderFogOfWar(
    ctx: CanvasRenderingContext2D,
    rc: RenderContext,
    leftTile: number,
    rightTile: number,
    topTile: number,
    bottomTile: number
  ) {
    for (let ty = topTile; ty <= bottomTile; ty++) {
      for (let tx = leftTile; tx <= rightTile; tx++) {
        const isRevealed = rc.revealedTiles[ty] && rc.revealedTiles[ty][tx];
        if (!isRevealed) {
          const x = tx * TILE_SIZE;
          const y = ty * TILE_SIZE;

          ctx.fillStyle = '#0a1626';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

          ctx.fillStyle = '#112236';
          ctx.beginPath();
          ctx.arc(x + 24, y + 24, 16, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  // --- AMBIENT DAY / SUNSET / NIGHT LIGHTING ---
  private renderAmbientLighting(ctx: CanvasRenderingContext2D, rc: RenderContext) {
    const t = rc.timeOfDay;
    let overlayColor = 'rgba(0, 0, 0, 0)';

    if (t >= 0.0 && t < 0.18) {
      const factor = 1 - t / 0.18;
      overlayColor = `rgba(251, 146, 60, ${0.14 * factor})`;
    } else if (t >= 0.18 && t < 0.6) {
      overlayColor = 'rgba(0, 0, 0, 0)';
    } else if (t >= 0.6 && t < 0.74) {
      const progress = (t - 0.6) / 0.14;
      overlayColor = `rgba(249, 115, 22, ${0.22 * progress})`;
    } else if (t >= 0.74 && t < 0.94) {
      // Atmospheric dark blue tint at night for Kletva Otoka
      overlayColor = 'rgba(10, 20, 52, 0.44)';
    } else {
      const progress = (t - 0.94) / 0.06;
      overlayColor = `rgba(18, 24, 60, ${0.34 * (1 - progress)})`;
    }

    if (overlayColor !== 'rgba(0, 0, 0, 0)') {
      ctx.fillStyle = overlayColor;
      ctx.fillRect(0, 0, rc.canvas.width, rc.canvas.height);
    }
  }

  // --- NPC VILLAGERS: VISUALS & PROXIMITY DIALOGUE INDICATOR ---
  private renderNPC(
    ctx: CanvasRenderingContext2D,
    npc: NPCEntity,
    gameTime: number,
    player: PlayerState
  ) {
    const x = npc.x;
    const y = npc.y;
    const breath = Math.sin(gameTime * 2.8 + npc.tileX) * 1.5;

    // Ground shadow
    ctx.fillStyle = 'rgba(15, 23, 42, 0.35)';
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 10, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body by NPC identity
    if (npc.id === 'npc_goran') {
      // Starac Goran: Elder robe, long silver beard, walking staff with lantern
      // Robe
      ctx.fillStyle = '#78350f';
      ctx.beginPath();
      ctx.roundRect(x - 6, y - 4 + breath, 12, 14, 3);
      ctx.fill();

      // Head & face
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(x, y - 10 + breath, 5, 0, Math.PI * 2);
      ctx.fill();

      // Long Silver Beard
      ctx.fillStyle = '#e2e8f0';
      ctx.beginPath();
      ctx.moveTo(x - 4, y - 9 + breath);
      ctx.lineTo(x + 4, y - 9 + breath);
      ctx.lineTo(x, y - 1 + breath);
      ctx.closePath();
      ctx.fill();

      // Staff with warm glowing lantern in hand
      ctx.strokeStyle = '#451a03';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(x + 8, y + 10);
      ctx.lineTo(x + 8, y - 15 + breath);
      ctx.stroke();

      // Lantern
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(x + 8, y - 16 + breath, 2.5, 0, Math.PI * 2);
      ctx.fill();
    } else if (npc.id === 'npc_mate') {
      // Ribar Mate: Sailor vest, roll-up pants, fisherman cap, fishing pole
      // Pants
      ctx.fillStyle = '#d4c5b9';
      ctx.fillRect(x - 4, y + 3, 3.5, 7);
      ctx.fillRect(x + 0.5, y + 3, 3.5, 7);

      // Sailor Vest
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(x - 6, y - 5 + breath, 12, 9, 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(x, y - 10 + breath, 5, 0, Math.PI * 2);
      ctx.fill();

      // Yellow Sou'wester Fisherman Cap
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.ellipse(x, y - 13 + breath, 6.5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - 4, y - 16 + breath, 8, 4);

      // Fishing Rod
      ctx.strokeStyle = '#854d0e';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(x - 5, y + 4);
      ctx.lineTo(x - 14, y - 18 + breath);
      ctx.stroke();
    } else {
      // Travarica Mara: Sage green hooded cape, botanical satchel
      // Cloak
      ctx.fillStyle = '#166534';
      ctx.beginPath();
      ctx.roundRect(x - 6, y - 4 + breath, 12, 14, 3);
      ctx.fill();

      // Head
      ctx.fillStyle = '#fed7aa';
      ctx.beginPath();
      ctx.arc(x, y - 10 + breath, 5, 0, Math.PI * 2);
      ctx.fill();

      // Hood
      ctx.fillStyle = '#15803d';
      ctx.beginPath();
      ctx.arc(x, y - 12 + breath, 6, Math.PI * 0.8, Math.PI * 2.2);
      ctx.fill();

      // Herbal Satchel with glowing violet flowers
      ctx.fillStyle = '#78350f';
      ctx.fillRect(x + 4, y + 2 + breath, 4, 4);
      ctx.fillStyle = '#c084fc';
      ctx.fillRect(x + 5, y + 1 + breath, 2, 2);
    }

    // Name badge above NPC
    ctx.save();
    ctx.font = '600 11px "Fredoka", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    const nameW = ctx.measureText(npc.name).width;
    ctx.beginPath();
    ctx.roundRect(x - nameW / 2 - 5, y - 27 + breath, nameW + 10, 14, 4);
    ctx.fill();
    ctx.fillStyle = npc.color;
    ctx.fillText(npc.name, x, y - 16 + breath);
    ctx.restore();

    // Proximity "Talk" Indicator
    const distToPlayer = Math.hypot(player.x - x, player.y - y);
    if (distToPlayer < 68) {
      const bubbleBob = Math.sin(gameTime * 4.5) * 2.5;
      const by = y - 37 + breath + bubbleBob;

      ctx.save();
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';

      // Speech bubble background
      ctx.fillStyle = '#f59e0b';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.roundRect(x - 22, by - 10, 44, 15, 6);
      ctx.fill();

      // Little tail
      ctx.beginPath();
      ctx.moveTo(x - 3, by + 5);
      ctx.lineTo(x, by + 8);
      ctx.lineTo(x + 3, by + 5);
      ctx.closePath();
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0f172a';
      ctx.fillText('💬 Pričaj', x, by + 1);
      ctx.restore();
    }
  }

  // --- SHORELINE MIST (Gentle ethereal fog along the water boundaries) ---
  private renderShorelineMist(
    ctx: CanvasRenderingContext2D,
    map: GameMap,
    leftTile: number,
    rightTile: number,
    topTile: number,
    bottomTile: number,
    gameTime: number,
    revealedTiles: boolean[][]
  ) {
    const isWater = (t: string) => t === 'DEEP_WATER' || t === 'WATER' || t === 'SHALLOW_WATER';

    for (let ty = topTile; ty <= bottomTile; ty += 2) {
      for (let tx = leftTile; tx <= rightTile; tx += 2) {
        if (!revealedTiles[ty] || !revealedTiles[ty][tx]) continue;
        const tile = map.tiles[ty][tx];

        // Only draw mist near the coastline (shallow water or beach sand)
        if (tile === 'SHALLOW_WATER' || tile === 'SAND') {
          const mistSeed = (tx * 17 + ty * 41) % 9;
          if (mistSeed === 2 || mistSeed === 5) {
            const driftX = (gameTime * 6 + tx * 15) % 60 - 30;
            const driftY = Math.sin(gameTime * 1.2 + ty) * 4;

            const mx = tx * TILE_SIZE + 24 + driftX;
            const my = ty * TILE_SIZE + 24 + driftY;

            ctx.fillStyle = 'rgba(219, 234, 254, 0.08)';
            ctx.beginPath();
            ctx.ellipse(mx, my, 28, 12, 0.1, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }
  }

  // --- NIGHT SEA WHIPS (Visual-only ethereal whips rising from the sea at night) ---
  private renderNightSeaWhips(
    ctx: CanvasRenderingContext2D,
    map: GameMap,
    leftTile: number,
    rightTile: number,
    topTile: number,
    bottomTile: number,
    gameTime: number,
    timeOfDay: number,
    revealedTiles: boolean[][]
  ) {
    // Only active during evening / night cycle
    const isNight = timeOfDay > 0.68 && timeOfDay < 0.98;
    if (!isNight) return;

    // Smooth night intensity curve
    const nightFactor = Math.sin(((timeOfDay - 0.68) / 0.3) * Math.PI);

    const isWater = (t: string) => t === 'DEEP_WATER' || t === 'WATER';

    for (let ty = topTile; ty <= bottomTile; ty++) {
      for (let tx = leftTile; tx <= rightTile; tx++) {
        if (!revealedTiles[ty] || !revealedTiles[ty][tx]) continue;
        const tile = map.tiles[ty][tx];
        if (!isWater(tile)) continue;

        // Spread whips across deterministic spots on the sea
        const spotHash = (tx * 37 + ty * 73) % 11;
        if (spotHash === 3 || spotHash === 7) {
          // Staggered timing for each spot
          const whipCycle = (gameTime * 0.85 + tx * 0.9 + ty * 1.3) % 6.0;

          // Whip appears for 2.2 seconds out of 6.0
          if (whipCycle < 2.2) {
            const progress = whipCycle / 2.2;
            const riseProgress = Math.sin(progress * Math.PI); // 0 -> 1 -> 0
            const whipHeight = riseProgress * (34 + (spotHash % 12));

            const bx = tx * TILE_SIZE + 24 + ((spotHash * 5) % 14) - 7;
            const by = ty * TILE_SIZE + 24 + ((spotHash * 7) % 14) - 7;

            // 1. Water ripples at the surge point
            ctx.save();
            ctx.strokeStyle = `rgba(56, 189, 248, ${nightFactor * riseProgress * 0.45})`;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.ellipse(bx, by, 12 * (1 + progress * 0.4), 6 * (1 + progress * 0.4), 0, 0, Math.PI * 2);
            ctx.stroke();

            // 2. Curving magical whip line
            const wave1 = Math.sin(gameTime * 4.5 + tx) * (14 * riseProgress);
            const wave2 = Math.cos(gameTime * 5.2 + ty) * (18 * riseProgress);

            const tipX = bx + wave1;
            const tipY = by - whipHeight;
            const cp1X = bx + Math.sin(gameTime * 3.5) * 8;
            const cp1Y = by - whipHeight * 0.45;
            const cp2X = bx + wave2;
            const cp2Y = by - whipHeight * 0.8;

            // Outer ethereal violet glow
            ctx.strokeStyle = `rgba(168, 85, 247, ${nightFactor * riseProgress * 0.65})`;
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, tipX, tipY);
            ctx.stroke();

            // Inner electric cyan core
            ctx.strokeStyle = `rgba(56, 189, 248, ${nightFactor * riseProgress * 0.95})`;
            ctx.lineWidth = 1.6;
            ctx.beginPath();
            ctx.moveTo(bx, by);
            ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, tipX, tipY);
            ctx.stroke();

            // Tip spark
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#38bdf8';
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(tipX, tipY, 2.2 * riseProgress, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
          }
        }
      }
    }
  }
}
