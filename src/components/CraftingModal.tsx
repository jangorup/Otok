/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Axe, Pickaxe, Package, Check, Sparkles, AlertCircle } from 'lucide-react';
import { Inventory } from '../game/types';

interface CraftingModalProps {
  isOpen: boolean;
  inventory: Inventory;
  totalItems: number;
  maxCapacity: number;
  onCraft: (recipe: 'AXE' | 'PICKAXE' | 'BAG') => void;
  onClose: () => void;
}

export const CraftingModal: React.FC<CraftingModalProps> = ({
  isOpen,
  inventory,
  totalItems,
  maxCapacity,
  onCraft,
  onClose,
}) => {
  if (!isOpen) return null;

  const twigs = inventory.twigs || 0;
  const pebbles = inventory.pebbles || 0;
  const fibre = inventory.fibre || 0;

  const canCraftAxe = !inventory.hasAxe && twigs >= 4 && pebbles >= 3;
  const canCraftPickaxe = !inventory.hasPickaxe && twigs >= 4 && pebbles >= 4;
  const canCraftBag = !inventory.hasBag && fibre >= 5 && twigs >= 3;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/80 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-lg bg-slate-900/95 border border-amber-600/40 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-900/40 bg-gradient-to-r from-amber-950/60 to-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center text-base">
              🔨
            </div>
            <div>
              <h2 className="font-heading font-bold text-base text-amber-200">
                Obrtnički panj
              </h2>
              <p className="text-xs text-amber-300/70">
                Izradi alate od otočnih grančica i kamenčića
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Materials & Capacity Banner */}
        <div className="px-5 py-2.5 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5" title="Grančice">
              <span className="text-sm">🪵</span>
              <span className="font-medium text-slate-300">Grančice:</span>
              <span className={`font-bold tabular-nums ${twigs > 0 ? 'text-amber-300' : 'text-slate-500'}`}>
                {twigs}
              </span>
            </div>
            <div className="flex items-center gap-1.5" title="Kamenčići">
              <span className="text-sm">🪨</span>
              <span className="font-medium text-slate-300">Kamenčići:</span>
              <span className={`font-bold tabular-nums ${pebbles > 0 ? 'text-slate-200' : 'text-slate-500'}`}>
                {pebbles}
              </span>
            </div>
            <div className="flex items-center gap-1.5" title="Vlakna">
              <span className="text-sm">🌿</span>
              <span className="font-medium text-slate-300">Vlakna:</span>
              <span className={`font-bold tabular-nums ${fibre > 0 ? 'text-emerald-300' : 'text-slate-500'}`}>
                {fibre}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span>🎒</span>
            <span className="text-slate-400">Ruksak:</span>
            <span
              className={`font-bold tabular-nums px-2 py-0.5 rounded-md ${
                totalItems >= maxCapacity
                  ? 'bg-rose-950 text-rose-300 border border-rose-800'
                  : totalItems >= maxCapacity - 3
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-slate-800 text-slate-200 border border-slate-700'
              }`}
            >
              {totalItems} / {maxCapacity}
            </span>
          </div>
        </div>

        {/* Crafting Options */}
        <div className="p-4 space-y-3 overflow-y-auto">
          {/* 1. Kamena sjekira */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              inventory.hasAxe
                ? 'bg-slate-900/60 border-slate-800 opacity-80'
                : canCraftAxe
                ? 'bg-amber-950/25 border-amber-500/50 shadow-md ring-1 ring-amber-400/20'
                : 'bg-slate-850/60 border-slate-800/80'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 shrink-0">
                  <Axe className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-sm text-slate-100">
                      Kamena sjekira
                    </h3>
                    {inventory.hasAxe && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        Izrađeno
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Omogućuje rušenje stabala na otoku i prikupljanje pravog drva za gradnju skloništa.
                  </p>

                  {!inventory.hasAxe && (
                    <div className="flex items-center gap-3 mt-2.5 text-xs">
                      <span className="text-slate-400 text-[11px]">Potrebno:</span>
                      <span
                        className={`font-semibold ${
                          twigs >= 4 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        🪵 4 Grančice ({twigs}/4)
                      </span>
                      <span
                        className={`font-semibold ${
                          pebbles >= 3 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        🪨 3 Kamenčića ({pebbles}/3)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {!inventory.hasAxe && (
                <button
                  type="button"
                  onClick={() => onCraft('AXE')}
                  disabled={!canCraftAxe}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    canCraftAxe
                      ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-lg active:scale-95 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                  }`}
                >
                  Izradi
                </button>
              )}
            </div>
          </div>

          {/* 2. Kameni kramp */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              inventory.hasPickaxe
                ? 'bg-slate-900/60 border-slate-800 opacity-80'
                : canCraftPickaxe
                ? 'bg-sky-950/25 border-sky-500/50 shadow-md ring-1 ring-sky-400/20'
                : 'bg-slate-850/60 border-slate-800/80'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-300 shrink-0">
                  <Pickaxe className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-sm text-slate-100">
                      Kameni kramp
                    </h3>
                    {inventory.hasPickaxe && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        Izrađeno
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Omogućuje razbijanje velikih stijena i prikupljanje čvrstog klesanog kamena.
                  </p>

                  {!inventory.hasPickaxe && (
                    <div className="flex items-center gap-3 mt-2.5 text-xs">
                      <span className="text-slate-400 text-[11px]">Potrebno:</span>
                      <span
                        className={`font-semibold ${
                          twigs >= 4 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        🪵 4 Grančice ({twigs}/4)
                      </span>
                      <span
                        className={`font-semibold ${
                          pebbles >= 4 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        🪨 4 Kamenčića ({pebbles}/4)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {!inventory.hasPickaxe && (
                <button
                  type="button"
                  onClick={() => onCraft('PICKAXE')}
                  disabled={!canCraftPickaxe}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    canCraftPickaxe
                      ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 shadow-lg active:scale-95 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                  }`}
                >
                  Izradi
                </button>
              )}
            </div>
          </div>

          {/* 3. Pletena otočna torba */}
          <div
            className={`p-3.5 rounded-xl border transition-all ${
              inventory.hasBag
                ? 'bg-slate-900/60 border-slate-800 opacity-80'
                : canCraftBag
                ? 'bg-purple-950/25 border-purple-500/50 shadow-md ring-1 ring-purple-400/20'
                : 'bg-slate-850/60 border-slate-800/80'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 shrink-0">
                  <Package className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-heading font-bold text-sm text-slate-100">
                      Pletena torba (+4 mjesta)
                    </h3>
                    {inventory.hasBag && (
                      <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/50 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        Izrađeno
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Torba ispletena od otočnih vlakana i grančica. Povećava skromni kapacitet inventara sa 16 na 20 mjesta.
                  </p>

                  {!inventory.hasBag && (
                    <div className="flex items-center gap-3 mt-2.5 text-xs">
                      <span className="text-slate-400 text-[11px]">Potrebno:</span>
                      <span
                        className={`font-semibold ${
                          fibre >= 5 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        🌿 5 Vlakana ({fibre}/5)
                      </span>
                      <span
                        className={`font-semibold ${
                          twigs >= 3 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        🪵 3 Grančice ({twigs}/3)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {!inventory.hasBag && (
                <button
                  type="button"
                  onClick={() => onCraft('BAG')}
                  disabled={!canCraftBag}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold shrink-0 transition-all ${
                    canCraftBag
                      ? 'bg-purple-500 hover:bg-purple-400 text-white shadow-lg active:scale-95 cursor-pointer'
                      : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed'
                  }`}
                >
                  Izradi
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Footer tip */}
        <div className="p-3 bg-slate-950/80 border-t border-slate-800/80 flex items-center gap-2 text-xs text-slate-400">
          <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Grančice i kamenčići leže po travi i obali otoka te se mogu skupljati golim rukama bez alata.
          </span>
        </div>
      </div>
    </div>
  );
};
