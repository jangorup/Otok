import { TILE_SIZE, MAP_WIDTH, MAP_HEIGHT, BUILDINGS } from './constants';
import { GameMap } from './mapGenerator';
import { PlayerState, PlacedBuilding, FloatingText, Particle, SmokeParticle, BuildingType, CharacterCustomization, PetState } from './types';

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
}

export class GameRenderer {
  // Pre-cached offscreen tiles or textures can be added if needed,
  // but direct canvas 2D vector drawing for 40x40 viewport runs smoothly at 60fps.

  public render(rc: RenderContext) {
    const { canvas, ctx, camera, map } = rc;
    const width = canvas.width;
    const height = canvas.height;

    ctx.save();
    // Clear whole canvas with deep ocean base
    ctx.fillStyle = '#16314f';
    ctx.fillRect(0, 0, width, height);

    // Compute visible tile bounds to cull tiles outside camera
    const leftTile = Math.max(0, Math.floor((camera.x - width / 2) / TILE_SIZE) - 1);
    const rightTile = Math.min(MAP_WIDTH - 1, Math.ceil((camera.x + width / 2) / TILE_SIZE) + 1);
    const topTile = Math.max(0, Math.floor((camera.y - height / 2) / TILE_SIZE) - 1);
    const bottomTile = Math.min(MAP_HEIGHT - 1, Math.ceil((camera.y + height / 2) / TILE_SIZE) + 1);

    // Camera transform: centered on camera.x, camera.y
    ctx.translate(Math.floor(width / 2 - camera.x), Math.floor(height / 2 - camera.y));

    // 1. Draw Ground / Water Tiles
    for (let ty = topTile; ty <= bottomTile; ty++) {
      for (let tx = leftTile; tx <= rightTile; tx++) {
        const isRevealed = rc.revealedTiles[ty] && rc.revealedTiles[ty][tx];
        // If completely unrevealed and no neighbor revealed, we can skip ground or draw fog later
        this.renderTile(ctx, map.tiles[ty][tx], tx, ty, rc.gameTime, isRevealed);
      }
    }

    // 2. Y-Sorted Objects (Resources, Placed Buildings, Player)
    // Gather all sortable entities
    interface RenderEntity {
      yOrder: number;
      draw: () => void;
    }
    const entities: RenderEntity[] = [];

    // Resources
    map.resources.forEach((res) => {
      if (res.x >= leftTile && res.x <= rightTile && res.y >= topTile && res.y <= bottomTile) {
        const isRevealed = rc.revealedTiles[res.y] && rc.revealedTiles[res.y][res.x];
        if (isRevealed) {
          entities.push({
            yOrder: (res.y + 0.9) * TILE_SIZE,
            draw: () => this.renderResource(ctx, res, rc.gameTime),
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

    // 4. Particles (leaf dust, stone chips, smoke)
    this.renderParticles(ctx, rc.particles);
    this.renderSmokeParticles(ctx, rc.smokeParticles);

    // 5. Floating texts (+1 Drvo, etc.)
    this.renderFloatingTexts(ctx, rc.floatingTexts);

    // 6. Fog of War
    this.renderFogOfWar(ctx, rc, leftTile, rightTile, topTile, bottomTile);

    // 7. Day / Night ambient lighting tone
    this.renderAmbientLighting(ctx, rc);

    ctx.restore();
  }

  private renderTile(
    ctx: CanvasRenderingContext2D,
    type: string,
    tx: number,
    ty: number,
    gameTime: number,
    revealed: boolean
  ) {
    const x = tx * TILE_SIZE;
    const y = ty * TILE_SIZE;

    if (!revealed) {
      // Lightly hint undiscovered terrain or leave for fog
      ctx.fillStyle = '#1c2d42';
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
      return;
    }

    switch (type) {
      case 'DEEP_WATER': {
        ctx.fillStyle = '#1e3a5f';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        // Subtle deep wave ripples
        const wave = Math.sin(gameTime * 1.5 + tx * 0.8 + ty * 0.5);
        if (wave > 0.4) {
          ctx.strokeStyle = '#274770';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x + 24, y + 24, 12, 0, Math.PI * 0.6);
          ctx.stroke();
        }
        break;
      }

      case 'WATER': {
        ctx.fillStyle = '#295b8d';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        // Gentle water flow
        const wave = Math.sin(gameTime * 2 + tx * 0.6 + ty * 0.7);
        ctx.fillStyle = '#3b7bb8';
        ctx.fillRect(x + 12 + wave * 4, y + 20, 16, 2);
        break;
      }

      case 'SHALLOW_WATER': {
        ctx.fillStyle = '#4288b8';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
        // Shore wave foam animation
        const wavePhase = (gameTime * 1.2 + tx * 0.4 + ty * 0.5) % Math.PI;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.fillRect(x + 6, y + 6 + Math.sin(wavePhase) * 6, TILE_SIZE - 12, 3);
        break;
      }

      case 'SAND': {
        // Warm Mediterranean coastal beach sand
        ctx.fillStyle = '#e8c988';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Soft grain flecks
        const seed = (tx * 17 + ty * 31) % 10;
        if (seed > 6) {
          ctx.fillStyle = '#dfbe79';
          ctx.fillRect(x + 14, y + 18, 3, 2);
          ctx.fillRect(x + 32, y + 36, 2, 2);
        }
        break;
      }

      case 'GRASS': {
        // Lush Mediterranean warm olive green
        ctx.fillStyle = '#5c9646';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Little blade tufts and occasional wild flowers
        const seed = (tx * 23 + ty * 47) % 12;
        if (seed === 1) {
          // Red poppy flower
          ctx.fillStyle = '#3c7529';
          ctx.fillRect(x + 20, y + 24, 2, 6);
          ctx.fillStyle = '#e04040';
          ctx.beginPath();
          ctx.arc(x + 21, y + 22, 3, 0, Math.PI * 2);
          ctx.fill();
        } else if (seed === 5) {
          // Wild chamomile
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x + 30, y + 16, 3, 3);
          ctx.fillStyle = '#eab308';
          ctx.fillRect(x + 31, y + 17, 1, 1);
        } else if (seed > 7) {
          // Grass tuft
          ctx.fillStyle = '#4d8438';
          ctx.fillRect(x + 12, y + 20, 2, 4);
          ctx.fillRect(x + 15, y + 18, 2, 6);
        }
        break;
      }

      case 'FOREST_GRASS': {
        // Rich pine soil & shaded moss
        ctx.fillStyle = '#3f7036';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        ctx.fillStyle = '#2f5728';
        ctx.fillRect(x + 16, y + 14, 4, 3);
        ctx.fillRect(x + 28, y + 32, 5, 2);
        break;
      }

      case 'HILL_ROCK': {
        // Warm Mediterranean limestone cliff / rocky hill
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

        // Rocky bevel & cracks
        ctx.fillStyle = '#64748b';
        ctx.fillRect(x, y + TILE_SIZE - 6, TILE_SIZE, 6);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(x, y, TILE_SIZE, 4);
        break;
      }

      default:
        ctx.fillStyle = '#5c9646';
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    }
  }

  private renderResource(ctx: CanvasRenderingContext2D, res: any, gameTime: number) {
    const cx = res.x * TILE_SIZE + TILE_SIZE / 2;
    const cy = res.y * TILE_SIZE + TILE_SIZE / 2;

    if (!res.available) {
      // Stump or regrowing sprout
      if (res.type === 'WOOD') {
        // Small cute tree stump with rings
        ctx.fillStyle = 'rgba(0,0,0,0.18)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 12, 10, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(cx - 7, cy + 2, 14, 10);
        ctx.fillStyle = '#d2a679';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 2, 7, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        // Tiny regrowth leaf
        ctx.fillStyle = '#4ade80';
        ctx.beginPath();
        ctx.arc(cx + 3, cy - 2, 3, 0, Math.PI * 2);
        ctx.fill();
      } else if (res.type === 'STONE') {
        // Rubble pile
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(cx - 6, cy + 6, 5, 4);
        ctx.fillRect(cx + 1, cy + 7, 6, 5);
      } else if (res.type === 'FIBRE') {
        // Sprouting tiny shoot
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(cx - 1, cy + 6, 3, 5);
      }
      return;
    }

    switch (res.type) {
      case 'WOOD': {
        // Tree: Olive tree or coastal Mediterranean pine
        const sway = Math.sin(gameTime * 2 + res.x * 3) * 1.5;

        // Ground shadow
        ctx.fillStyle = 'rgba(15, 30, 20, 0.28)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 14, 16, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Gnarled olive trunk
        ctx.fillStyle = '#6d4c33';
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy + 14);
        ctx.lineTo(cx - 3, cy - 4);
        ctx.lineTo(cx + 4, cy - 4);
        ctx.lineTo(cx + 6, cy + 14);
        ctx.closePath();
        ctx.fill();

        // Silvery-green layered olive canopy
        const canopyY = cy - 14 + sway;

        // Base canopy shade
        ctx.fillStyle = '#3a6634';
        ctx.beginPath();
        ctx.arc(cx - 8, canopyY + 4, 14, 0, Math.PI * 2);
        ctx.arc(cx + 8, canopyY + 4, 14, 0, Math.PI * 2);
        ctx.arc(cx, canopyY - 6, 16, 0, Math.PI * 2);
        ctx.fill();

        // Main soft olive highlight
        ctx.fillStyle = '#659c58';
        ctx.beginPath();
        ctx.arc(cx - 7, canopyY + 2, 12, 0, Math.PI * 2);
        ctx.arc(cx + 7, canopyY + 2, 12, 0, Math.PI * 2);
        ctx.arc(cx, canopyY - 7, 14, 0, Math.PI * 2);
        ctx.fill();

        // Silvery-leaf top sheen
        ctx.fillStyle = '#8fbf7f';
        ctx.beginPath();
        ctx.arc(cx - 3, canopyY - 10, 8, 0, Math.PI * 2);
        ctx.arc(cx + 4, canopyY - 4, 7, 0, Math.PI * 2);
        ctx.fill();

        // Ripe little black olives
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.arc(cx - 6, canopyY + 5, 2, 0, Math.PI * 2);
        ctx.arc(cx + 7, canopyY + 8, 2, 0, Math.PI * 2);
        ctx.arc(cx + 1, canopyY + 2, 2, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'STONE': {
        // Natural weathered limestone boulder
        ctx.fillStyle = 'rgba(15, 25, 35, 0.25)';
        ctx.beginPath();
        ctx.ellipse(cx + 1, cy + 10, 14, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Base stone body
        ctx.fillStyle = '#64748b';
        ctx.beginPath();
        ctx.roundRect(cx - 13, cy - 4, 26, 17, 7);
        ctx.fill();

        // Light warm limestone face
        ctx.fillStyle = '#94a3b8';
        ctx.beginPath();
        ctx.roundRect(cx - 12, cy - 7, 24, 14, 6);
        ctx.fill();

        // Chiseled sunlit top
        ctx.fillStyle = '#cbd5e1';
        ctx.beginPath();
        ctx.roundRect(cx - 9, cy - 9, 18, 7, 4);
        ctx.fill();

        // Subtle fissures/cracks
        ctx.strokeStyle = '#475569';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(cx - 3, cy - 4);
        ctx.lineTo(cx + 2, cy + 1);
        ctx.lineTo(cx + 5, cy - 2);
        ctx.stroke();
        break;
      }

      case 'FIBRE': {
        // Wild fragrant Mediterranean lavender bush
        ctx.fillStyle = 'rgba(15, 30, 20, 0.2)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 10, 11, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Green shrub foliage
        ctx.fillStyle = '#3c7530';
        ctx.beginPath();
        ctx.arc(cx - 5, cy + 4, 8, 0, Math.PI * 2);
        ctx.arc(cx + 5, cy + 4, 8, 0, Math.PI * 2);
        ctx.arc(cx, cy - 1, 9, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#569b47';
        ctx.beginPath();
        ctx.arc(cx, cy + 1, 7, 0, Math.PI * 2);
        ctx.fill();

        // Fragrant purple lavender flower stalks
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(cx - 6, cy - 6, 3, 6);
        ctx.fillRect(cx + 4, cy - 7, 3, 7);
        ctx.fillRect(cx - 1, cy - 9, 3, 8);

        ctx.fillStyle = '#c084fc';
        ctx.fillRect(cx - 6, cy - 8, 3, 3);
        ctx.fillRect(cx + 4, cy - 9, 3, 3);
        ctx.fillRect(cx - 1, cy - 11, 3, 3);
        break;
      }

      case 'SHELL': {
        // Beautiful coastal seashell on sand
        ctx.fillStyle = 'rgba(60, 40, 20, 0.2)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 5, 7, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Pinkish-white scallop shell
        ctx.fillStyle = '#fce7f3';
        ctx.beginPath();
        ctx.arc(cx, cy + 1, 6, Math.PI, 0, false);
        ctx.lineTo(cx, cy + 4);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, cy + 4);
        ctx.lineTo(cx - 4, cy - 3);
        ctx.moveTo(cx, cy + 4);
        ctx.lineTo(cx, cy - 5);
        ctx.moveTo(cx, cy + 4);
        ctx.lineTo(cx + 4, cy - 3);
        ctx.stroke();
        break;
      }

      case 'SAND_PILE': {
        // Soft golden mound of sifted sand
        ctx.fillStyle = 'rgba(60, 40, 20, 0.18)';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 6, 12, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#eab308';
        ctx.beginPath();
        ctx.ellipse(cx, cy + 2, 10, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#fde047';
        ctx.beginPath();
        ctx.ellipse(cx - 2, cy - 1, 6, 3, 0, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
    }
  }

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

    // Ground shadow for building
    ctx.fillStyle = 'rgba(15, 25, 35, 0.35)';
    ctx.beginPath();
    ctx.roundRect(x + 4, y + h - 6, w - 8, 12, 6);
    ctx.fill();

    switch (b.type) {
      case 'HUT': {
        // Mala koliba (2x2): Cozy wooden cabin with thatched palm/straw roof
        // Wooden log walls
        ctx.fillStyle = '#8b5a2b';
        ctx.fillRect(x + 8, y + 24, w - 16, h - 28);

        // Horizontal wood board grooves
        ctx.fillStyle = '#6e4420';
        for (let gy = y + 36; gy < y + h - 6; gy += 12) {
          ctx.fillRect(x + 8, gy, w - 16, 2);
        }

        // Wooden Door
        ctx.fillStyle = '#543217';
        ctx.fillRect(x + w / 2 - 8, y + h - 34, 16, 30);
        ctx.fillStyle = '#d97706'; // brass handle
        ctx.fillRect(x + w / 2 + 3, y + h - 20, 2, 3);

        // Thatched Straw / Palm Overhanging Roof
        ctx.fillStyle = '#b4833e';
        ctx.beginPath();
        ctx.moveTo(x + 2, y + 28);
        ctx.lineTo(x + w / 2, y + 2);
        ctx.lineTo(x + w - 2, y + 28);
        ctx.closePath();
        ctx.fill();

        // Highlight thatched layers
        ctx.fillStyle = '#d4a359';
        ctx.beginPath();
        ctx.moveTo(x + 10, y + 24);
        ctx.lineTo(x + w / 2, y + 6);
        ctx.lineTo(x + w - 10, y + 24);
        ctx.closePath();
        ctx.fill();

        // Little stone chimney on top left
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x + 16, y - 2, 10, 14);
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(x + 15, y - 4, 12, 3);

        // Cozy lantern hanging by door
        const lanternX = x + w / 2 - 14;
        const lanternY = y + h - 26;
        ctx.fillStyle = '#475569';
        ctx.fillRect(lanternX, lanternY, 4, 7);

        // Warm lantern glow
        const glow = isNight ? 0.85 : 0.4;
        const pulse = 1 + Math.sin(gameTime * 4 + b.x) * 0.1;
        const grad = ctx.createRadialGradient(lanternX + 2, lanternY + 4, 1, lanternX + 2, lanternY + 4, 18 * pulse);
        grad.addColorStop(0, `rgba(251, 191, 36, ${glow})`);
        grad.addColorStop(1, 'rgba(251, 191, 36, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(lanternX + 2, lanternY + 4, 18 * pulse, 0, Math.PI * 2);
        ctx.fill();
        break;
      }

      case 'STONE_HOUSE': {
        // Kamena kuća (2x2): Mediterranean whitewashed limestone + terracotta roof tiles
        // Whitewashed limestone wall
        ctx.fillStyle = '#f1f5f9';
        ctx.fillRect(x + 6, y + 28, w - 12, h - 32);

        // Stone texture corners (quoin stones)
        ctx.fillStyle = '#cbd5e1';
        ctx.fillRect(x + 6, y + 28, 6, 8);
        ctx.fillRect(x + 6, y + 44, 6, 8);
        ctx.fillRect(x + w - 12, y + 28, 6, 8);
        ctx.fillRect(x + w - 12, y + 44, 6, 8);

        // Blue Mediterranean window with shutters
        const winX = x + 16;
        const winY = y + 40;
        // Window opening
        ctx.fillStyle = isNight ? '#fbbf24' : '#38bdf8';
        ctx.fillRect(winX, winY, 14, 14);
        // Blue shutters
        ctx.fillStyle = '#0284c7';
        ctx.fillRect(winX - 5, winY, 5, 14);
        ctx.fillRect(winX + 14, winY, 5, 14);
        // Cross mullion
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(winX + 6, winY, 2, 14);
        ctx.fillRect(winX, winY + 6, 14, 2);

        // Flower box under window with pink geraniums
        ctx.fillStyle = '#78350f';
        ctx.fillRect(winX - 3, winY + 14, 20, 4);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(winX, winY + 13, 3, 3);
        ctx.fillRect(winX + 6, winY + 12, 3, 3);
        ctx.fillRect(winX + 12, winY + 13, 3, 3);

        // Solid wood arched doorway
        const doorX = x + w - 32;
        const doorY = y + h - 36;
        ctx.fillStyle = '#713f12';
        ctx.beginPath();
        ctx.arc(doorX + 9, doorY + 6, 9, Math.PI, 0);
        ctx.lineTo(doorX + 18, doorY + 32);
        ctx.lineTo(doorX, doorY + 32);
        ctx.closePath();
        ctx.fill();

        // Mediterranean terracotta roof tiles ("kanalice")
        ctx.fillStyle = '#c2410c'; // rich terracotta
        ctx.beginPath();
        ctx.moveTo(x, y + 30);
        ctx.lineTo(x + w / 2, y + 4);
        ctx.lineTo(x + w, y + 30);
        ctx.closePath();
        ctx.fill();

        // Terracotta tile ridge grooves
        ctx.strokeStyle = '#9a3412';
        ctx.lineWidth = 2;
        for (let rx = x + 10; rx < x + w - 10; rx += 10) {
          ctx.beginPath();
          ctx.moveTo(rx, y + 29);
          ctx.lineTo(x + w / 2 + (rx - (x + w / 2)) * 0.2, y + 6);
          ctx.stroke();
        }

        // Stone Chimney
        ctx.fillStyle = '#64748b';
        ctx.fillRect(x + w - 24, y, 10, 16);
        ctx.fillStyle = '#94a3b8';
        ctx.fillRect(x + w - 26, y - 2, 14, 3);

        if (isNight) {
          // Warm window glow into the garden
          const wGlow = ctx.createRadialGradient(winX + 7, winY + 7, 2, winX + 7, winY + 7, 32);
          wGlow.addColorStop(0, 'rgba(251, 191, 36, 0.7)');
          wGlow.addColorStop(1, 'rgba(251, 191, 36, 0)');
          ctx.fillStyle = wGlow;
          ctx.beginPath();
          ctx.arc(winX + 7, winY + 7, 32, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }

      case 'BEACH_COTTAGE': {
        // Kućica uz plažu (3x2): Coastal wooden cottage with awning, stilt deck & seaside charm
        // Wooden stilt piers below
        ctx.fillStyle = '#5c3a21';
        ctx.fillRect(x + 10, y + h - 16, 6, 14);
        ctx.fillRect(x + w / 2 - 3, y + h - 16, 6, 14);
        ctx.fillRect(x + w - 16, y + h - 16, 6, 14);

        // Deck boardwalk
        ctx.fillStyle = '#a16207';
        ctx.fillRect(x + 4, y + h - 18, w - 8, 6);

        // Soft pastel blue-painted wooden walls
        ctx.fillStyle = '#bae6fd';
        ctx.fillRect(x + 8, y + 26, w - 16, h - 42);

        // White trims
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(x + 8, y + 26, w - 16, 3);
        ctx.fillRect(x + 8, y + 26, 4, h - 42);
        ctx.fillRect(x + w - 12, y + 26, 4, h - 42);

        // Two sunny cottage windows
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

        // Striped awning over deck (terracotta & cream stripes)
        const awningY = y + 24;
        const numStripes = 8;
        const stripeW = (w - 12) / numStripes;
        for (let i = 0; i < numStripes; i++) {
          ctx.fillStyle = i % 2 === 0 ? '#ea580c' : '#fef08a';
          ctx.fillRect(x + 6 + i * stripeW, awningY, stripeW, 10);
        }

        // Coastal pitched roof
        ctx.fillStyle = '#0369a1';
        ctx.beginPath();
        ctx.moveTo(x + 2, awningY);
        ctx.lineTo(x + w / 2, y + 4);
        ctx.lineTo(x + w - 2, awningY);
        ctx.closePath();
        ctx.fill();

        // Cute decorative lifebuoy ring on the wall
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

        // Coastal hanging lantern
        const lanternX = x + 12;
        const lanternY = y + h - 22;
        ctx.fillStyle = isNight ? '#fde047' : '#cbd5e1';
        ctx.fillRect(lanternX, lanternY, 4, 6);
        break;
      }
    }
  }

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

    // Soft player shadow
    ctx.fillStyle = 'rgba(15, 25, 35, 0.32)';
    ctx.beginPath();
    ctx.ellipse(x, y + 16, 11, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Walking animation bob and foot movement
    const walkCycle = p.isMoving ? Math.sin(gameTime * 12) : 0;
    const footOffset = p.isMoving ? Math.sin(gameTime * 12) * 4 : 0;
    const bob = Math.abs(walkCycle) * 2;

    // Feet / Shoes
    ctx.fillStyle = '#5c3a21'; // Leather sandals/shoes
    if (p.direction === 'LEFT' || p.direction === 'RIGHT') {
      ctx.fillRect(x - 5 + footOffset, y + 14 - bob, 5, 4);
      ctx.fillRect(x + 1 - footOffset, y + 14 - bob, 5, 4);
    } else {
      ctx.fillRect(x - 6, y + 14 + footOffset - bob, 5, 4);
      ctx.fillRect(x + 2, y + 14 - footOffset - bob, 5, 4);
    }

    // Customized Pants
    ctx.fillStyle = pants;
    ctx.fillRect(x - 6, y + 6 - bob, 12, 9);

    // Customized Shirt
    ctx.fillStyle = shirt;
    ctx.fillRect(x - 7, y - 6 - bob, 14, 13);

    // Leather satchel belt across shoulder
    ctx.strokeStyle = '#78350f';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(x - 6, y - 5 - bob);
    ctx.lineTo(x + 5, y + 5 - bob);
    ctx.stroke();

    // Little satchel bag
    ctx.fillStyle = '#92400e';
    ctx.fillRect(x + 4, y + 2 - bob, 5, 6);

    // Hands / Arms & Tool Swing Animation
    ctx.fillStyle = skin; // Skin tone
    if (p.actionTimer > 0) {
      // Swing motion!
      const swingAngle = (1 - p.actionTimer) * Math.PI;
      ctx.save();
      ctx.translate(x + (p.direction === 'LEFT' ? -6 : 6), y - 2 - bob);
      ctx.rotate(p.direction === 'LEFT' ? -swingAngle : swingAngle);

      // Tool handle
      ctx.fillStyle = '#92400e';
      ctx.fillRect(-2, -14, 3, 16);

      // Tool head (axe/pickaxe)
      ctx.fillStyle = '#cbd5e1';
      ctx.fillRect(-6, -16, 11, 4);
      ctx.restore();
    } else {
      // Idle / Walking arms
      ctx.fillRect(x - 9, y - 2 - bob - footOffset * 0.5, 3, 6);
      ctx.fillRect(x + 6, y - 2 - bob + footOffset * 0.5, 3, 6);
    }

    // Head
    const headY = y - 13 - bob;
    ctx.fillStyle = skin; // Customized face
    ctx.beginPath();
    ctx.arc(x, headY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Eyes depending on direction
    ctx.fillStyle = '#1e293b';
    if (p.direction === 'DOWN') {
      ctx.fillRect(x - 3, headY - 1, 2, 2);
      ctx.fillRect(x + 1, headY - 1, 2, 2);
    } else if (p.direction === 'LEFT') {
      ctx.fillRect(x - 4, headY - 1, 2, 2);
    } else if (p.direction === 'RIGHT') {
      ctx.fillRect(x + 2, headY - 1, 2, 2);
    }

    // Hair rendering
    if (hairStyle !== 'NONE') {
      ctx.fillStyle = hair;
      if (hairStyle === 'SHORT') {
        ctx.beginPath();
        ctx.arc(x, headY - 2, 7, Math.PI, 0);
        ctx.lineTo(x + 6, headY);
        ctx.lineTo(x - 6, headY);
        ctx.closePath();
        ctx.fill();
      } else if (hairStyle === 'LONG') {
        ctx.beginPath();
        ctx.arc(x, headY - 2, 7, Math.PI, 0);
        ctx.lineTo(x + 7, headY + 7);
        ctx.lineTo(x + 4, headY + 7);
        ctx.lineTo(x + 4, headY + 1);
        ctx.lineTo(x - 4, headY + 1);
        ctx.lineTo(x - 4, headY + 7);
        ctx.lineTo(x - 7, headY + 7);
        ctx.closePath();
        ctx.fill();
      } else if (hairStyle === 'CURLY') {
        ctx.beginPath();
        ctx.arc(x - 4, headY - 4, 4, 0, Math.PI * 2);
        ctx.arc(x + 4, headY - 4, 4, 0, Math.PI * 2);
        ctx.arc(x, headY - 6, 4.5, 0, Math.PI * 2);
        ctx.arc(x - 6, headY, 3.5, 0, Math.PI * 2);
        ctx.arc(x + 6, headY, 3.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (hairStyle === 'BAND') {
        ctx.beginPath();
        ctx.arc(x, headY - 2, 7, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#ef4444'; // Red headband
        ctx.fillRect(x - 6, headY - 3, 12, 2.5);
      }
    }

    // Headwear / Hat
    const hatY = headY - 4;
    if (hat === 'STRAW_HAT') {
      // Wide-Brimmed Straw Sunhat
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.ellipse(x, hatY + 1, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Crown
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.ellipse(x, hatY - 2, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();

      // Hat ribbon band
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(x - 6, hatY - 1, 12, 2);
    } else if (hat === 'CAP') {
      // Mariner / Newsboy cap
      ctx.fillStyle = '#1e3a5f';
      ctx.beginPath();
      ctx.ellipse(x, hatY - 1, 8, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(p.direction === 'LEFT' ? x - 9 : x, hatY + 1, 9, 2.5);
    } else if (hat === 'FLOWER') {
      // Mediterranean flower crown
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(x - 6, hatY + 1, 12, 2);
      ctx.fillStyle = '#ef4444'; // Red poppy
      ctx.beginPath();
      ctx.arc(x - 4, hatY + 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c084fc'; // Lavender blossom
      ctx.beginPath();
      ctx.arc(x + 3, hatY, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047'; // Chamomile
      ctx.beginPath();
      ctx.arc(x, hatY + 1, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderPet(ctx: CanvasRenderingContext2D, pet: PetState, gameTime: number) {
    const x = pet.x;
    let y = pet.y;

    // Happy bounce animation if petted
    const happyBounce = pet.happyTimer > 0 ? Math.sin(pet.happyTimer * 16) * 5 : 0;
    y -= Math.max(0, happyBounce);

    const isLeft = pet.direction === 'LEFT';
    const trot = pet.isMoving ? Math.sin(gameTime * 14) : 0;

    // Shadow
    ctx.fillStyle = 'rgba(15, 25, 35, 0.28)';
    ctx.beginPath();
    ctx.ellipse(x, pet.y + 7, pet.type === 'HAMSTER' ? 5 : 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    switch (pet.type) {
      case 'DOG': {
        // Golden puppy with floppy ears and wagging tail
        const tailWag = Math.sin(gameTime * 16) * 0.45;

        // Tail
        ctx.save();
        ctx.translate(isLeft ? x + 7 : x - 7, y - 2);
        ctx.rotate(isLeft ? -tailWag : tailWag);
        ctx.fillStyle = '#d97706';
        ctx.fillRect(-1.5, -6, 3, 6);
        ctx.restore();

        // Body
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.roundRect(x - 7, y - 4, 14, 9, 4);
        ctx.fill();

        // Legs
        ctx.fillStyle = '#d97706';
        ctx.fillRect(x - 5, y + 4 + trot * 2, 2.5, 4);
        ctx.fillRect(x + 2, y + 4 - trot * 2, 2.5, 4);

        // Head
        const hx = isLeft ? x - 6 : x + 6;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(hx, y - 5, 5.5, 0, Math.PI * 2);
        ctx.fill();

        // Floppy Ears
        ctx.fillStyle = '#b45309';
        ctx.beginPath();
        ctx.ellipse(isLeft ? hx + 3 : hx - 3, y - 7, 2.5, 4, 0.2, 0, Math.PI * 2);
        ctx.fill();

        // Cute face & wet nose
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(isLeft ? hx - 3 : hx + 1, y - 6, 1.5, 1.5); // Eye
        ctx.fillRect(isLeft ? hx - 5 : hx + 3, y - 4, 2, 1.5); // Nose

        // Red collar
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(isLeft ? hx - 1 : hx - 3, y - 1, 4, 1.5);
        ctx.fillStyle = '#fde047'; // Bell
        ctx.fillRect(isLeft ? hx : hx - 1, y, 1.5, 1.5);
        break;
      }

      case 'CAT': {
        // Ginger/cream cozy cat with arched tail and pointy ears
        const tailSway = Math.sin(gameTime * 6) * 0.3;

        // Arched tail
        ctx.strokeStyle = '#ea580c';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(isLeft ? x + 6 : x - 6, y);
        ctx.quadraticCurveTo(
          isLeft ? x + 10 + tailSway * 3 : x - 10 - tailSway * 3,
          y - 6,
          isLeft ? x + 8 : x - 8,
          y - 12
        );
        ctx.stroke();

        // Body
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.roundRect(x - 6, y - 3, 12, 8, 4);
        ctx.fill();

        // Cream chest
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(isLeft ? x - 5 : x + 1, y - 1, 4, 5);

        // Legs
        ctx.fillStyle = '#ea580c';
        ctx.fillRect(x - 4, y + 4 + trot * 2, 2, 4);
        ctx.fillRect(x + 2, y + 4 - trot * 2, 2, 4);

        // Head
        const hx = isLeft ? x - 5 : x + 5;
        ctx.fillStyle = '#f97316';
        ctx.beginPath();
        ctx.arc(hx, y - 4, 5, 0, Math.PI * 2);
        ctx.fill();

        // Pointed Ears
        ctx.fillStyle = '#ea580c';
        ctx.beginPath();
        ctx.moveTo(hx - 3, y - 7);
        ctx.lineTo(hx - 1, y - 11);
        ctx.lineTo(hx + 1, y - 7);
        ctx.moveTo(hx + 1, y - 7);
        ctx.lineTo(hx + 3, y - 11);
        ctx.lineTo(hx + 5, y - 7);
        ctx.fill();

        // Pink inner ear
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(hx - 2, y - 9, 1.5, 2);
        ctx.fillRect(hx + 2, y - 9, 1.5, 2);

        // Eyes
        ctx.fillStyle = '#22c55e'; // Green cat eye
        ctx.fillRect(isLeft ? hx - 3 : hx + 1, y - 5, 1.5, 2);
        break;
      }

      case 'RABBIT': {
        // Fluffy bunny with long ears and hopping bounce
        const hopY = pet.isMoving ? Math.abs(Math.sin(gameTime * 10)) * 5 : 0;
        const ry = y - hopY;

        // Cotton tail
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(isLeft ? x + 6 : x - 6, ry + 1, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Body
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.roundRect(x - 6, ry - 3, 12, 8, 4);
        ctx.fill();

        // Feet
        ctx.fillStyle = '#e2e8f0';
        ctx.fillRect(x - 4, ry + 4, 3, 3);
        ctx.fillRect(x + 2, ry + 4, 3, 3);

        // Head
        const hx = isLeft ? x - 4 : x + 4;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(hx, ry - 3, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Long upright ears
        ctx.fillStyle = '#f1f5f9';
        ctx.beginPath();
        ctx.roundRect(hx - 2, ry - 11, 2.5, 7, 1);
        ctx.roundRect(hx + 1, ry - 11, 2.5, 7, 1);
        ctx.fill();

        // Pink ear lining
        ctx.fillStyle = '#fbcfe8';
        ctx.fillRect(hx - 1.5, ry - 9.5, 1.5, 4.5);
        ctx.fillRect(hx + 1.5, ry - 9.5, 1.5, 4.5);

        // Pink nose & eye
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(isLeft ? hx - 4 : hx + 2.5, ry - 2.5, 1.5, 1.5);
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(isLeft ? hx - 2 : hx + 0.5, ry - 4, 1.5, 1.5);
        break;
      }

      case 'PARROT': {
        // Vibrant tropical parrot with fluttering wings
        const hoverBob = Math.sin(gameTime * 8) * 3;
        const wingFlap = pet.isMoving ? Math.sin(gameTime * 18) * 0.5 : Math.sin(gameTime * 6) * 0.2;
        const py = y - 6 + hoverBob;

        // Long tail feathers
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(isLeft ? x + 5 : x - 5, py + 2);
        ctx.lineTo(isLeft ? x + 10 : x - 10, py + 9);
        ctx.stroke();

        // Red body
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.ellipse(x, py, 5, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wing
        ctx.save();
        ctx.translate(isLeft ? x + 1 : x - 1, py - 2);
        ctx.rotate(isLeft ? wingFlap : -wingFlap);
        ctx.fillStyle = '#0284c7'; // Blue wing
        ctx.beginPath();
        ctx.roundRect(-2, -1, 5, 7, 2);
        ctx.fill();
        ctx.fillStyle = '#fde047'; // Yellow accent
        ctx.fillRect(-1, 2, 3, 2);
        ctx.restore();

        // Head & Crest
        const hx = isLeft ? x - 3 : x + 3;
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(hx, py - 5, 4, 0, Math.PI * 2);
        ctx.fill();

        // Yellow curved beak
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.moveTo(isLeft ? hx - 3 : hx + 3, py - 6);
        ctx.lineTo(isLeft ? hx - 6 : hx + 6, py - 4);
        ctx.lineTo(isLeft ? hx - 3 : hx + 3, py - 3);
        ctx.closePath();
        ctx.fill();

        // Eye
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(isLeft ? hx - 1.5 : hx, py - 6, 1.5, 1.5);
        break;
      }

      case 'HAMSTER': {
        // Chubby tiny golden hamster with round cheeks
        const hy = y + 1;

        // Round chubby body
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.ellipse(x, hy, 6, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // White belly
        ctx.fillStyle = '#fef08a';
        ctx.beginPath();
        ctx.ellipse(x, hy + 1, 4, 3, 0, 0, Math.PI * 2);
        ctx.fill();

        // Little paws
        ctx.fillStyle = '#fed7aa';
        ctx.fillRect(x - 3, hy + 4 + trot * 1.5, 2, 2);
        ctx.fillRect(x + 1, hy + 4 - trot * 1.5, 2, 2);

        // Head & Chubby Cheeks
        const hx = isLeft ? x - 4 : x + 4;
        ctx.fillStyle = '#d97706';
        ctx.beginPath();
        ctx.arc(hx, hy - 2, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Cheeks
        ctx.fillStyle = '#fed7aa';
        ctx.beginPath();
        ctx.arc(isLeft ? hx - 1.5 : hx + 1.5, hy, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Tiny pink ears
        ctx.fillStyle = '#fbcfe8';
        ctx.beginPath();
        ctx.arc(hx - 2, hy - 5.5, 1.5, 0, Math.PI * 2);
        ctx.arc(hx + 2, hy - 5.5, 1.5, 0, Math.PI * 2);
        ctx.fill();

        // Eye & Nose
        ctx.fillStyle = '#1e293b';
        ctx.fillRect(isLeft ? hx - 2 : hx, hy - 3, 1.5, 1.5);
        ctx.fillStyle = '#f43f5e';
        ctx.fillRect(isLeft ? hx - 3.5 : hx + 2, hy - 1, 1, 1);
        break;
      }
    }

    // Floating heart when happy
    if (pet.happyTimer > 0) {
      const heartAlpha = Math.min(1, pet.happyTimer);
      ctx.save();
      ctx.globalAlpha = heartAlpha;
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('❤️', x, y - 14 - (1 - pet.happyTimer) * 8);
      ctx.restore();
    }
  }

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

    // Highlight area grid
    ctx.fillStyle = isValid ? 'rgba(34, 197, 94, 0.35)' : 'rgba(239, 68, 68, 0.45)';
    ctx.fillRect(x, y, w, h);

    ctx.strokeStyle = isValid ? '#22c55e' : '#ef4444';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(x, y, w, h);

    // Ghost icon or preview
    ctx.save();
    ctx.globalAlpha = 0.65;
    this.renderBuilding(
      ctx,
      { id: 'ghost', type: def.type, x: tileX, y: tileY, placedAt: 0 },
      def,
      0.3,
      0
    );
    ctx.restore();
  }

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
      ctx.fillStyle = `rgba(226, 232, 240, ${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size * (1 + progress * 1.5), 0, Math.PI * 2);
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
      // Text shadow outline
      ctx.strokeStyle = `rgba(0, 0, 0, ${alpha * 0.75})`;
      ctx.lineWidth = 3;
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
    // Render smooth fog of war over tiles that haven't been revealed
    for (let ty = topTile; ty <= bottomTile; ty++) {
      for (let tx = leftTile; tx <= rightTile; tx++) {
        const isRevealed = rc.revealedTiles[ty] && rc.revealedTiles[ty][tx];
        if (!isRevealed) {
          const x = tx * TILE_SIZE;
          const y = ty * TILE_SIZE;

          // Cozy mist / fog
          ctx.fillStyle = '#0f172a';
          ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

          // Subtle cloud speck
          ctx.fillStyle = '#1e293b';
          ctx.beginPath();
          ctx.arc(x + 24, y + 24, 16, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }
  }

  private renderAmbientLighting(ctx: CanvasRenderingContext2D, rc: RenderContext) {
    // Gentle Mediterranean day/night cycle that only changes the color tone softly
    // timeOfDay: 0.0 = 6am, 0.25 = 12pm, 0.5 = 6pm, 0.75 = 12am
    const t = rc.timeOfDay;
    let overlayColor = 'rgba(0, 0, 0, 0)';

    if (t >= 0.0 && t < 0.2) {
      // Golden dawn: warm soft peach/gold
      const factor = 1 - t / 0.2;
      overlayColor = `rgba(251, 146, 60, ${0.12 * factor})`;
    } else if (t >= 0.2 && t < 0.6) {
      // Daylight: clear sun, minimal tint
      overlayColor = 'rgba(0, 0, 0, 0)';
    } else if (t >= 0.6 && t < 0.75) {
      // Golden Mediterranean sunset
      const progress = (t - 0.6) / 0.15;
      overlayColor = `rgba(249, 115, 22, ${0.18 * progress})`;
    } else if (t >= 0.75 && t < 0.95) {
      // Gentle calm night: soft Mediterranean deep indigo
      const nightStrength = 0.32;
      overlayColor = `rgba(15, 23, 42, ${nightStrength})`;
    } else {
      // Transition back to dawn
      const progress = (t - 0.95) / 0.05;
      overlayColor = `rgba(30, 27, 75, ${0.25 * (1 - progress)})`;
    }

    if (overlayColor !== 'rgba(0, 0, 0, 0)') {
      const left = rc.camera.x - rc.canvas.width / 2 - 100;
      const top = rc.camera.y - rc.canvas.height / 2 - 100;
      const w = rc.canvas.width + 200;
      const h = rc.canvas.height + 200;

      ctx.fillStyle = overlayColor;
      ctx.fillRect(left, top, w, h);
    }
  }
}
