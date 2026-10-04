import React from 'react';
import { Hammer, Check, X, Axe, Pickaxe, Hand, Sparkles, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, MessageSquare, AlertTriangle } from 'lucide-react';
import { ResourceNode, BuildingType, NPCEntity, CraftingStationEntity, Inventory } from '../game/types';
import { RESOURCE_INFO, BUILDINGS } from '../game/constants';

interface ActionControlsProps {
  targetNode: ResourceNode | null;
  targetNpc?: NPCEntity | null;
  targetStation?: CraftingStationEntity | null;
  inventory?: Inventory;
  isInventoryFull?: boolean;
  placementMode: {
    active: boolean;
    buildingType: BuildingType;
    isValid: boolean;
  } | null;
  onAction: () => void;
  onOpenBuild: () => void;
  onCancelPlacement: () => void;
  onNudgePlacement?: (dx: number, dy: number) => void;
}

export const ActionControls: React.FC<ActionControlsProps> = ({
  targetNode,
  targetNpc,
  targetStation,
  inventory,
  isInventoryFull = false,
  placementMode,
  onAction,
  onOpenBuild,
  onCancelPlacement,
  onNudgePlacement,
}) => {
  const isPlacement = placementMode !== null && placementMode.active;

  // Determine button icon and label
  let actionLabel = 'Djeluj';
  let ActionIcon: React.ComponentType<{ className?: string }> = Hand;
  let actionBg = 'bg-amber-500/80 hover:bg-amber-500 text-slate-950';

  if (placementMode && placementMode.active) {
    actionLabel = 'Postavi';
    ActionIcon = Check;
    actionBg = placementMode.isValid
      ? 'bg-emerald-500/90 hover:bg-emerald-500 text-white shadow-emerald-500/30'
      : 'bg-slate-700/80 text-slate-400 cursor-not-allowed';
  } else if (targetStation) {
    actionLabel = 'Izradi';
    ActionIcon = Hammer;
    actionBg = 'bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-amber-400/50 ring-2 ring-amber-300/60 animate-pulse';
  } else if (targetNpc) {
    actionLabel = 'Pričaj';
    ActionIcon = MessageSquare;
    actionBg = 'bg-cyan-400 hover:bg-cyan-300 text-slate-950 shadow-cyan-400/40 ring-2 ring-cyan-300/50';
  } else if (targetNode && targetNode.available) {
    const info = RESOURCE_INFO[targetNode.type];

    if (targetNode.type === 'WOOD' && !inventory?.hasAxe) {
      actionLabel = 'Sjekira?';
      ActionIcon = Axe;
      actionBg = 'bg-amber-950/80 text-amber-200 border border-amber-600/60';
    } else if (targetNode.type === 'STONE' && !inventory?.hasPickaxe) {
      actionLabel = 'Kramp?';
      ActionIcon = Pickaxe;
      actionBg = 'bg-sky-950/80 text-sky-200 border border-sky-600/60';
    } else if (isInventoryFull) {
      actionLabel = 'Pun ruksak';
      ActionIcon = AlertTriangle;
      actionBg = 'bg-rose-950/80 text-rose-300 border border-rose-600/60';
    } else {
      actionLabel = info.toolAction;
      if (targetNode.type === 'WOOD') ActionIcon = Axe;
      else if (targetNode.type === 'STONE') ActionIcon = Pickaxe;
      else if (targetNode.type === 'FIBRE') ActionIcon = Sparkles;
      else ActionIcon = Hand;

      actionBg = 'bg-amber-400/90 hover:bg-amber-400 text-slate-950 shadow-amber-400/30';
    }
  }

  return (
    <div className="flex flex-col items-end gap-3 select-none touch-none">
      {/* Placement adjustment D-pad if placement mode is active */}
      {placementMode && placementMode.active && onNudgePlacement && (
        <div className="flex flex-col items-center bg-slate-900/80 backdrop-blur-xs p-2 rounded-2xl border border-white/20 shadow-xl mb-1">
          <div className="text-[11px] font-semibold text-amber-300 mb-1">
            Pomakni ({BUILDINGS[placementMode.buildingType]?.name})
          </div>
          <div className="grid grid-cols-3 gap-1">
            <div />
            <button
              type="button"
              onClick={() => onNudgePlacement(0, -1)}
              className="w-10 h-10 rounded-xl bg-white/15 active:bg-amber-400 active:text-slate-950 flex items-center justify-center text-white"
            >
              <ChevronUp className="w-6 h-6" />
            </button>
            <div />
            <button
              type="button"
              onClick={() => onNudgePlacement(-1, 0)}
              className="w-10 h-10 rounded-xl bg-white/15 active:bg-amber-400 active:text-slate-950 flex items-center justify-center text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <div />
            <button
              type="button"
              onClick={() => onNudgePlacement(1, 0)}
              className="w-10 h-10 rounded-xl bg-white/15 active:bg-amber-400 active:text-slate-950 flex items-center justify-center text-white"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
            <div />
            <button
              type="button"
              onClick={() => onNudgePlacement(0, 1)}
              className="w-10 h-10 rounded-xl bg-white/15 active:bg-amber-400 active:text-slate-950 flex items-center justify-center text-white"
            >
              <ChevronDown className="w-6 h-6" />
            </button>
            <div />
          </div>
        </div>
      )}

      {/* Build / Cancel Button */}
      {isPlacement ? (
        <button
          type="button"
          onClick={onCancelPlacement}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-rose-600/80 hover:bg-rose-600 active:scale-95 text-white font-medium text-xs shadow-lg backdrop-blur-xs border border-white/20 transition-all"
        >
          <X className="w-4 h-4" />
          <span>Odustani</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenBuild}
          className="flex items-center gap-2 px-5 py-3 rounded-full bg-slate-900/65 hover:bg-slate-900/80 active:scale-95 text-amber-300 font-semibold text-sm shadow-xl backdrop-blur-xs border border-amber-400/40 transition-all"
        >
          <Hammer className="w-5 h-5 text-amber-400" />
          <span>Gradi</span>
        </button>
      )}

      {/* Main Large Action Button */}
      <button
        type="button"
        onClick={onAction}
        disabled={Boolean(placementMode && !placementMode.isValid)}
        className={`relative w-20 h-20 rounded-full flex flex-col items-center justify-center shadow-2xl active:scale-90 transition-all backdrop-blur-xs border-2 border-white/30 ${actionBg}`}
        style={{
          boxShadow: '0 8px 24px rgba(0,0,0,0.35)',
        }}
      >
        <ActionIcon className="w-7 h-7 mb-0.5" />
        <span className="text-[11px] font-bold tracking-tight uppercase leading-none">
          {actionLabel}
        </span>
      </button>
    </div>
  );
};
