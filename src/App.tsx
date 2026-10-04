/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine';
import { GameRenderer } from './game/renderer';
import { soundSystem } from './game/audio';
import { TILE_SIZE } from './game/constants';
import { Inventory, ResourceNode, BuildingType, NPCEntity } from './game/types';
import { OrientationLock } from './components/OrientationLock';
import { TopBar } from './components/TopBar';
import { VirtualJoystick } from './components/VirtualJoystick';
import { ActionControls } from './components/ActionControls';
import { BuildModal } from './components/BuildModal';
import { SettingsModal } from './components/SettingsModal';
import { StoryIntroModal } from './components/StoryIntroModal';
import { JournalModal } from './components/JournalModal';
import { DialogueModal } from './components/DialogueModal';
import { Lobby } from './components/Lobby';

export default function App() {
  const [currentView, setCurrentView] = useState<'LOBBY' | 'GAME'>('LOBBY');
  const [worldName, setWorldName] = useState<string>('Otok Magle');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<GameRenderer | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());

  // UI State
  const [inventory, setInventory] = useState<Inventory>({
    wood: 0,
    stone: 0,
    fibre: 0,
    shells: 0,
    sand: 0,
  });
  const [targetNode, setTargetNode] = useState<ResourceNode | null>(null);
  const [targetNpc, setTargetNpc] = useState<NPCEntity | null>(null);
  const [timeOfDay, setTimeOfDay] = useState<number>(0.25);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isBuildOpen, setIsBuildOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isIntroOpen, setIsIntroOpen] = useState<boolean>(false);
  const [isJournalOpen, setIsJournalOpen] = useState<boolean>(false);
  const [activeDialogueNpc, setActiveDialogueNpc] = useState<NPCEntity | null>(null);
  const [discoveredSecretIds, setDiscoveredSecretIds] = useState<string[]>([]);
  const [talkedToNpcIds, setTalkedToNpcIds] = useState<string[]>([]);
  const [placementModeState, setPlacementModeState] = useState<{
    active: boolean;
    buildingType: BuildingType;
    isValid: boolean;
  } | null>(null);

  // Camera Zoom Level (defaulting to 1.55x for close, comfortable mobile experience)
  const [zoomLevel, setZoomLevel] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('kletva_otoka_zoom');
      if (saved) {
        const val = parseFloat(saved);
        if (!isNaN(val) && val >= 0.8 && val <= 2.2) return val;
      }
    } catch {}
    return 1.55;
  });

  const zoomLevelRef = useRef<number>(zoomLevel);
  zoomLevelRef.current = zoomLevel;

  const handleSetZoom = useCallback((zoom: number) => {
    setZoomLevel(zoom);
    try {
      localStorage.setItem('kletva_otoka_zoom', zoom.toString());
    } catch {}
  }, []);

  const handleCycleZoom = useCallback(() => {
    setZoomLevel((prev) => {
      let next = 1.55;
      if (prev >= 1.7) next = 1.25;
      else if (prev >= 1.5) next = 1.75;
      else if (prev >= 1.2) next = 1.55;
      else next = 1.55;
      try {
        localStorage.setItem('kletva_otoka_zoom', next.toString());
      } catch {}
      return next;
    });
  }, []);

  // Initialize Engine & Renderer
  useEffect(() => {
    const engine = new GameEngine();
    const renderer = new GameRenderer();

    engineRef.current = engine;
    rendererRef.current = renderer;

    setInventory({ ...engine.inventory });
    setTimeOfDay(engine.timeOfDay);
    setWorldName(engine.worldName);
    setDiscoveredSecretIds([...engine.discoveredSecretIds]);
    setTalkedToNpcIds([...engine.talkedToNpcIds]);

    if (!engine.hasSeenIntro) {
      setIsIntroOpen(true);
    }

    engine.onInventoryChange = (newInv) => {
      setInventory({ ...newInv });
    };

    engine.onTargetNodeChange = (node) => {
      setTargetNode(node);
    };

    engine.onTargetNpcChange = (npc) => {
      setTargetNpc(npc);
    };

    engine.onOpenDialogue = (npc) => {
      setActiveDialogueNpc(npc);
      setTalkedToNpcIds([...engine.talkedToNpcIds]);
      setDiscoveredSecretIds([...engine.discoveredSecretIds]);
    };

    engine.onSecretDiscovered = () => {
      setDiscoveredSecretIds([...engine.discoveredSecretIds]);
    };

    engine.onTimeChange = (tod) => {
      setTimeOfDay(tod);
    };

    // First user gesture unlocks sound system
    const unlockAudio = () => {
      soundSystem.unlock();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio);
    window.addEventListener('keydown', unlockAudio);

    return () => {
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Main Game Loop (runs when in GAME view)
  useEffect(() => {
    if (currentView !== 'GAME') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      if (!canvas) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    const loop = (time: number) => {
      const dt = Math.min((time - lastTimeRef.current) / 1000, 0.1);
      lastTimeRef.current = time;

      const engine = engineRef.current;
      const renderer = rendererRef.current;

      if (engine && renderer) {
        // Update simulation
        engine.update(dt);

        // Sync placement state
        if (engine.placementMode && engine.placementMode.active) {
          setPlacementModeState({
            active: true,
            buildingType: engine.placementMode.buildingType,
            isValid: engine.placementMode.isValid,
          });
        } else {
          setPlacementModeState(null);
        }

        // Render frame
        renderer.render({
          canvas,
          ctx,
          map: engine.map,
          player: engine.player,
          character: engine.character,
          pet: engine.pet,
          revealedTiles: engine.revealedTiles,
          placedBuildings: engine.placedBuildings,
          floatingTexts: engine.floatingTexts,
          particles: engine.particles,
          smokeParticles: engine.smokeParticles,
          timeOfDay: engine.timeOfDay,
          gameTime: engine.gameTime,
          placementMode: engine.placementMode,
          camera: engine.camera,
          zoom: zoomLevelRef.current,
        });
      }

      animationFrameIdRef.current = requestAnimationFrame(loop);
    };

    lastTimeRef.current = performance.now();
    animationFrameIdRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
    };
  }, [currentView]);

  // Keyboard controls for WASD / Arrow keys
  useEffect(() => {
    if (currentView !== 'GAME') return;

    const keys: Record<string, boolean> = {};

    const updateKeys = () => {
      const engine = engineRef.current;
      if (!engine) return;

      let kx = 0;
      let ky = 0;
      if (keys['KeyW'] || keys['ArrowUp']) ky -= 1;
      if (keys['KeyS'] || keys['ArrowDown']) ky += 1;
      if (keys['KeyA'] || keys['ArrowLeft']) kx -= 1;
      if (keys['KeyD'] || keys['ArrowRight']) kx += 1;

      if (kx !== 0 || ky !== 0) {
        engine.setInputVector(kx, ky);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      updateKeys();

      // Space / KeyE for action
      if (e.code === 'Space' || e.code === 'KeyE') {
        e.preventDefault();
        handleAction();
      }

      // KeyB for Build
      if (e.code === 'KeyB') {
        setIsBuildOpen((prev) => !prev);
      }

      // Escape for cancel
      if (e.code === 'Escape') {
        if (engineRef.current?.placementMode) {
          engineRef.current.cancelPlacement();
          setPlacementModeState(null);
        }
        setIsBuildOpen(false);
        setIsSettingsOpen(false);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
      const engine = engineRef.current;
      if (engine) {
        let kx = 0;
        let ky = 0;
        if (keys['KeyW'] || keys['ArrowUp']) ky -= 1;
        if (keys['KeyS'] || keys['ArrowDown']) ky += 1;
        if (keys['KeyA'] || keys['ArrowLeft']) kx -= 1;
        if (keys['KeyD'] || keys['ArrowRight']) kx += 1;
        engine.setInputVector(kx, ky);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [currentView]);

  // World selection from Lobby
  const handleSelectWorld = useCallback((worldId: string) => {
    const engine = engineRef.current;
    if (engine) {
      engine.switchWorld(worldId);
      setWorldName(engine.worldName);
      setInventory({ ...engine.inventory });
      setTimeOfDay(engine.timeOfDay);
      setDiscoveredSecretIds([...engine.discoveredSecretIds]);
      setTalkedToNpcIds([...engine.talkedToNpcIds]);
      if (!engine.hasSeenIntro) {
        setIsIntroOpen(true);
      }
    }
    setCurrentView('GAME');
  }, []);

  // Return to Lobby
  const handleOpenLobby = useCallback(() => {
    const engine = engineRef.current;
    if (engine) {
      engine.persistSave();
    }
    soundSystem.playClick();
    setCurrentView('LOBBY');
  }, []);

  // Joystick move handler
  const handleJoystickMove = useCallback((vector: { x: number; y: number }) => {
    const engine = engineRef.current;
    if (engine) {
      engine.setInputVector(vector.x, vector.y);
    }
  }, []);

  // Action button clicked
  const handleAction = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.performAction();
  }, []);

  // Placement nudge
  const handleNudgePlacement = useCallback((dx: number, dy: number) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.movePlacementCursor(dx, dy);
  }, []);

  // Select building to place
  const handleSelectBuilding = useCallback((type: BuildingType) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.startPlacement(type);
    setPlacementModeState({
      active: true,
      buildingType: type,
      isValid: engine.placementMode?.isValid ?? false,
    });
  }, []);

  // Cancel building placement
  const handleCancelPlacement = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.cancelPlacement();
    setPlacementModeState(null);
  }, []);

  // Sound mute toggle
  const handleToggleMute = useCallback(() => {
    soundSystem.unlock();
    const newMuted = !isMuted;
    setIsMuted(newMuted);
    soundSystem.setMute(newMuted);
  }, [isMuted]);

  // Reset current world / start new game
  const handleNewGame = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.startNewGame();
    setWorldName(engine.worldName);
    setInventory({ ...engine.inventory });
    setTargetNode(null);
    setTargetNpc(null);
    setPlacementModeState(null);
    setDiscoveredSecretIds([]);
    setTalkedToNpcIds([]);
    setIsIntroOpen(true);
  }, []);

  // Canvas Tap/Click Handler (to interact with nearby objects or set placement target)
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas) return;

    soundSystem.unlock();

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Convert screen coordinates to world coordinates taking zoom into account
    const canvasCenterX = rect.width / 2;
    const canvasCenterY = rect.height / 2;
    const currentZoom = zoomLevelRef.current || 1.55;

    const worldX = engine.camera.x + (clickX - canvasCenterX) / currentZoom;
    const worldY = engine.camera.y + (clickY - canvasCenterY) / currentZoom;

    const tileX = Math.floor(worldX / TILE_SIZE);
    const tileY = Math.floor(worldY / TILE_SIZE);

    if (engine.placementMode && engine.placementMode.active) {
      engine.setPlacementPosition(tileX, tileY);
      return;
    }

    // Check if player clicked directly on an NPC (comfortable hit area on mobile)
    if (engine.map.npcs) {
      for (const npc of engine.map.npcs) {
        const distToNpc = Math.hypot(worldX - npc.x, worldY - npc.y);
        if (distToNpc < 40) {
          engine.talkToNpc(npc);
          return;
        }
      }
    }

    // Check if player clicked directly on their pet
    const distToPet = Math.hypot(worldX - engine.pet.x, worldY - engine.pet.y);
    if (distToPet < 35) {
      engine.petThePet();
      return;
    }

    // Check if player clicked directly on an adjacent resource
    const distToPlayer = Math.hypot(worldX - engine.player.x, worldY - engine.player.y);
    if (distToPlayer < 85) {
      for (const res of engine.map.resources) {
        if (res.available && res.x === tileX && res.y === tileY) {
          engine.performAction();
          return;
        }
      }
    }
  };

  return (
    <main className="relative w-screen h-screen overflow-hidden bg-slate-950 select-none touch-none">
      {/* Landscape Orientation Enforcement Overlay */}
      <OrientationLock />

      {/* LOBBY VIEW */}
      {currentView === 'LOBBY' && (
        <Lobby
          onSelectWorld={handleSelectWorld}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      )}

      {/* IN-GAME VIEW */}
      {currentView === 'GAME' && (
        <>
          {/* Game Canvas */}
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="block w-full h-full cursor-pointer touch-none"
          />

          {/* Top HUD: Inventory, Time of Day, Journal, Mute & Settings */}
          <TopBar
            worldName={worldName}
            inventory={inventory}
            timeOfDay={timeOfDay}
            isMuted={isMuted}
            secretsCount={discoveredSecretIds.length}
            zoomLevel={zoomLevel}
            onCycleZoom={handleCycleZoom}
            onToggleMute={handleToggleMute}
            onOpenJournal={() => setIsJournalOpen(true)}
            onOpenSettings={() => setIsSettingsOpen(true)}
            onOpenLobby={handleOpenLobby}
          />

          {/* Bottom Virtual Joystick (Left) */}
          <div className="fixed bottom-3 left-3 z-20 pointer-events-auto">
            <VirtualJoystick onMove={handleJoystickMove} />
          </div>

          {/* Bottom Action & Build Controls (Right) */}
          <div className="fixed bottom-3 right-3 z-20 pointer-events-auto">
            <ActionControls
              targetNode={targetNode}
              targetNpc={targetNpc}
              placementMode={placementModeState}
              onAction={handleAction}
              onOpenBuild={() => setIsBuildOpen(true)}
              onCancelPlacement={handleCancelPlacement}
              onNudgePlacement={handleNudgePlacement}
            />
          </div>

          {/* Build Menu Modal */}
          <BuildModal
            isOpen={isBuildOpen}
            inventory={inventory}
            onSelectBuilding={handleSelectBuilding}
            onClose={() => setIsBuildOpen(false)}
          />

          {/* Settings & Reset Modal */}
          <SettingsModal
            isOpen={isSettingsOpen}
            isMuted={isMuted}
            zoomLevel={zoomLevel}
            onSetZoom={handleSetZoom}
            onToggleMute={handleToggleMute}
            onNewGame={handleNewGame}
            onOpenLobby={handleOpenLobby}
            onShowIntro={() => setIsIntroOpen(true)}
            onClose={() => setIsSettingsOpen(false)}
          />

          {/* Story Intro Screen (3-4 slides, shown on new game, with skip) */}
          <StoryIntroModal
            isOpen={isIntroOpen}
            onComplete={() => {
              if (engineRef.current) {
                engineRef.current.hasSeenIntro = true;
                engineRef.current.persistSave();
              }
              setIsIntroOpen(false);
            }}
          />

          {/* Journal Panel (Current Goal & Discovered Secrets) */}
          <JournalModal
            isOpen={isJournalOpen}
            discoveredSecretIds={discoveredSecretIds}
            talkedToNpcCount={talkedToNpcIds.length}
            totalNpcCount={engineRef.current?.map.npcs?.length ?? 3}
            onClose={() => setIsJournalOpen(false)}
          />

          {/* NPC Dialogue Modal */}
          <DialogueModal
            npc={activeDialogueNpc}
            hasUnlockedSecret={Boolean(
              activeDialogueNpc?.associatedSecretId &&
                discoveredSecretIds.includes(activeDialogueNpc.associatedSecretId)
            )}
            onOpenJournal={() => setIsJournalOpen(true)}
            onClose={() => setActiveDialogueNpc(null)}
          />
        </>
      )}
    </main>
  );
}
