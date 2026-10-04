import React from 'react';
import { Volume2, VolumeX, Settings, Sun, Moon, Sunrise, Sunset, Home, BookOpen } from 'lucide-react';
import { Inventory } from '../game/types';

interface TopBarProps {
  worldName?: string;
  inventory: Inventory;
  timeOfDay: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onOpenLobby: () => void;
  onOpenJournal: () => void;
  onOpenCrafting?: () => void;
  secretsCount?: number;
  totalItems?: number;
  maxCapacity?: number;
}

export const TopBar: React.FC<TopBarProps> = ({
  worldName = 'Otok Magle',
  inventory,
  timeOfDay,
  isMuted,
  onToggleMute,
  onOpenSettings,
  onOpenLobby,
  onOpenJournal,
  onOpenCrafting,
  secretsCount = 0,
  totalItems = 0,
  maxCapacity = 16,
}) => {
  // Determine time label and icon
  let timeLabel = 'Dan';
  let TimeIcon = Sun;
  let timeColor = 'text-amber-300';

  if (timeOfDay < 0.2) {
    timeLabel = 'Jutro';
    TimeIcon = Sunrise;
    timeColor = 'text-amber-400';
  } else if (timeOfDay < 0.6) {
    timeLabel = 'Dan';
    TimeIcon = Sun;
    timeColor = 'text-yellow-300';
  } else if (timeOfDay < 0.75) {
    timeLabel = 'Suton';
    TimeIcon = Sunset;
    timeColor = 'text-orange-400';
  } else {
    timeLabel = 'Noć';
    TimeIcon = Moon;
    timeColor = 'text-indigo-300';
  }

  const isNearFull = totalItems >= maxCapacity - 2;
  const isFull = totalItems >= maxCapacity;

  return (
    <header className="fixed top-2 left-2 right-2 z-20 flex items-center justify-between pointer-events-none select-none">
      {/* Left side: Island wordmark & Time of Day */}
      <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/70 backdrop-blur-xs px-3 py-1.5 rounded-full border border-white/15 shadow-md max-w-[200px] truncate">
        <span className="font-heading font-bold text-sm tracking-wide text-amber-200 truncate">
          {worldName}
        </span>
        <span className="text-white/20">|</span>
        <div className="flex items-center gap-1 text-xs font-medium text-slate-200 shrink-0">
          <TimeIcon className={`w-3.5 h-3.5 ${timeColor}`} />
          <span className="text-[11px]">{timeLabel}</span>
        </div>
      </div>

      {/* Middle: Compact inventory bar with counts, twigs, pebbles, capacity & tool badges */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 pointer-events-auto bg-slate-900/80 backdrop-blur-xs px-3 py-1.5 rounded-full border border-white/20 shadow-lg text-xs overflow-x-auto max-w-[50vw]">
        {/* Capacity indicator */}
        <div
          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[11px] font-bold tabular-nums transition-colors ${
            isFull
              ? 'bg-rose-950 text-rose-300 border border-rose-800 animate-pulse'
              : isNearFull
              ? 'bg-amber-950 text-amber-300 border border-amber-800'
              : 'bg-slate-800 text-slate-300 border border-slate-700'
          }`}
          title={`Zauzetost ruksaka: ${totalItems} od ${maxCapacity} predmeta`}
        >
          <span>🎒</span>
          <span>
            {totalItems}/{maxCapacity}
          </span>
        </div>

        {/* Grančice / Twigs */}
        <div className="flex items-center gap-1" title="Male grančice">
          <span className="text-xs">🪵</span>
          <span className="font-semibold tabular-nums text-amber-300">
            {inventory.twigs || 0}
          </span>
        </div>

        {/* Kamenčići / Pebbles */}
        <div className="flex items-center gap-1" title="Mali kamenčići">
          <span className="text-xs">🪨</span>
          <span className="font-semibold tabular-nums text-slate-300">
            {inventory.pebbles || 0}
          </span>
        </div>

        {/* Wood / Drvo */}
        <div className="flex items-center gap-1" title="Drvo">
          <span className="text-xs">🌲</span>
          <span className="font-semibold tabular-nums text-slate-200">
            {inventory.wood}
          </span>
        </div>

        {/* Stone / Kamen */}
        <div className="flex items-center gap-1" title="Kamen">
          <span className="text-xs">⛰️</span>
          <span className="font-semibold tabular-nums text-slate-200">
            {inventory.stone}
          </span>
        </div>

        {/* Fibre / Vlakna */}
        <div className="flex items-center gap-1" title="Vlakna">
          <span className="text-xs">🌿</span>
          <span className="font-semibold tabular-nums text-emerald-300">
            {inventory.fibre}
          </span>
        </div>

        {/* Shells / Školjke */}
        <div className="flex items-center gap-1" title="Školjke">
          <span className="text-xs">🐚</span>
          <span className="font-semibold tabular-nums text-pink-300">
            {inventory.shells}
          </span>
        </div>

        {/* Sand / Pijesak */}
        <div className="flex items-center gap-1" title="Pijesak">
          <span className="text-xs">⏳</span>
          <span className="font-semibold tabular-nums text-amber-300">
            {inventory.sand}
          </span>
        </div>

        {/* Tools Badges */}
        {(inventory.hasAxe || inventory.hasPickaxe) && (
          <div className="flex items-center gap-1 pl-1 border-l border-white/15">
            {inventory.hasAxe && (
              <span className="text-xs" title="Kamena sjekira izrađena!">
                🪓
              </span>
            )}
            {inventory.hasPickaxe && (
              <span className="text-xs" title="Kameni kramp izrađen!">
                ⛏️
              </span>
            )}
          </div>
        )}
      </div>

      {/* Right side: Obrtnički panj, Journal, Lobby, Mute & Settings buttons */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
        {onOpenCrafting && (
          <button
            type="button"
            onClick={onOpenCrafting}
            aria-label="Obrtnički panj"
            title="Otvori Obrtnički panj za izradu alata"
            className="h-8 px-2.5 rounded-full bg-amber-950/70 hover:bg-amber-900/80 text-amber-300 flex items-center gap-1.5 backdrop-blur-xs border border-amber-500/40 shadow-md active:scale-95 transition-all text-xs font-semibold"
          >
            <span className="text-xs">🔨</span>
            <span className="hidden sm:inline">Panj</span>
          </button>
        )}

        <button
          type="button"
          onClick={onOpenJournal}
          aria-label="Dnevnik (Zadaci i tajne)"
          title="Otvori Dnevnik (Zadaci i tajne)"
          className="h-8 px-2.5 rounded-full bg-slate-900/80 hover:bg-slate-800 text-cyan-300 flex items-center gap-1.5 backdrop-blur-xs border border-cyan-500/30 shadow-md active:scale-95 transition-all text-xs font-semibold"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Dnevnik</span>
          {secretsCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 font-bold text-[10px] flex items-center justify-center">
              {secretsCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenLobby}
          aria-label="Predvorje / Svjetovi"
          title="Povratak u predvorje (svjetovi)"
          className="h-8 px-2.5 rounded-full bg-slate-900/70 hover:bg-slate-800 text-amber-300 flex items-center gap-1.5 backdrop-blur-xs border border-white/15 shadow-md active:scale-95 transition-all text-xs font-medium"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Predvorje</span>
        </button>

        <button
          type="button"
          onClick={onToggleMute}
          aria-label={isMuted ? 'Uključi zvuk' : 'Isključi zvuk'}
          className="w-8 h-8 rounded-full bg-slate-900/70 hover:bg-slate-800 text-slate-200 flex items-center justify-center backdrop-blur-xs border border-white/15 shadow-md active:scale-95 transition-all"
        >
          {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
        </button>

        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Postavke"
          className="w-8 h-8 rounded-full bg-slate-900/70 hover:bg-slate-800 text-slate-200 flex items-center justify-center backdrop-blur-xs border border-white/15 shadow-md active:scale-95 transition-all"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
