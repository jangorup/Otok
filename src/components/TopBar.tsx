import React from 'react';
import { Volume2, VolumeX, Settings, Sun, Moon, Sunrise, Sunset, Home } from 'lucide-react';
import { Inventory } from '../game/types';

interface TopBarProps {
  worldName?: string;
  inventory: Inventory;
  timeOfDay: number;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenSettings: () => void;
  onOpenLobby: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  worldName = 'Mirni Otok',
  inventory,
  timeOfDay,
  isMuted,
  onToggleMute,
  onOpenSettings,
  onOpenLobby,
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

      {/* Middle: Compact inventory bar with counts and custom resource icons */}
      <div className="flex items-center gap-2 sm:gap-3 pointer-events-auto bg-slate-900/75 backdrop-blur-xs px-3 py-1.5 rounded-full border border-white/20 shadow-lg">
        {/* Wood / Drvo */}
        <div className="flex items-center gap-1.5" title="Drvo">
          <div className="w-4 h-4 rounded-sm bg-[#8b5a2b] flex items-center justify-center text-[10px] text-amber-200 font-bold border border-amber-900/40">
            🪵
          </div>
          <span className="font-semibold text-xs tabular-nums text-slate-100">
            {inventory.wood}
          </span>
        </div>

        {/* Stone / Kamen */}
        <div className="flex items-center gap-1.5" title="Kamen">
          <div className="w-4 h-4 rounded-sm bg-[#64748b] flex items-center justify-center text-[10px] text-slate-200 font-bold border border-slate-700">
            🪨
          </div>
          <span className="font-semibold text-xs tabular-nums text-slate-100">
            {inventory.stone}
          </span>
        </div>

        {/* Fibre / Vlakna */}
        <div className="flex items-center gap-1.5" title="Vlakna">
          <div className="w-4 h-4 rounded-sm bg-[#15803d] flex items-center justify-center text-[10px] text-emerald-200 font-bold border border-emerald-900">
            🌿
          </div>
          <span className="font-semibold text-xs tabular-nums text-slate-100">
            {inventory.fibre}
          </span>
        </div>

        {/* Shells / Školjke */}
        <div className="flex items-center gap-1.5" title="Školjke">
          <div className="w-4 h-4 rounded-sm bg-[#f472b6] flex items-center justify-center text-[10px] text-pink-950 font-bold border border-pink-400">
            🐚
          </div>
          <span className="font-semibold text-xs tabular-nums text-slate-100">
            {inventory.shells}
          </span>
        </div>

        {/* Sand / Pijesak */}
        <div className="flex items-center gap-1.5" title="Pijesak">
          <div className="w-4 h-4 rounded-sm bg-[#f59e0b] flex items-center justify-center text-[10px] text-amber-950 font-bold border border-amber-300">
            ⏳
          </div>
          <span className="font-semibold text-xs tabular-nums text-slate-100">
            {inventory.sand}
          </span>
        </div>
      </div>

      {/* Right side: Lobby, Mute & Settings buttons */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
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
