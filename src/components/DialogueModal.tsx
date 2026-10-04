/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, MessageSquare, BookOpen } from 'lucide-react';
import { NPCEntity } from '../game/types';
import { soundSystem } from '../game/audio';

interface DialogueModalProps {
  npc: NPCEntity | null;
  hasUnlockedSecret?: boolean;
  onOpenJournal?: () => void;
  onClose: () => void;
}

export const DialogueModal: React.FC<DialogueModalProps> = ({
  npc,
  hasUnlockedSecret,
  onOpenJournal,
  onClose,
}) => {
  if (!npc) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs select-none touch-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-lg bg-slate-900/95 border border-slate-700/80 rounded-3xl p-5 shadow-2xl flex flex-col gap-3 text-slate-100 mb-2 sm:mb-0"
        style={{
          boxShadow: `0 20px 40px -15px ${npc.color}25`,
        }}
      >
        {/* Header with Avatar, Name, and Close */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-inner border border-white/20"
              style={{ backgroundColor: `${npc.color}25` }}
            >
              {npc.avatarIcon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-base text-amber-200">
                  {npc.name}
                </h3>
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: `${npc.color}20`,
                    borderColor: `${npc.color}40`,
                    color: npc.color,
                  }}
                >
                  {npc.role}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Stanovnik arhipelaga
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dialogue Speech Content */}
        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-2.5">
          <div className="flex items-start gap-2">
            <MessageSquare className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-100 leading-relaxed font-sans italic">
              "{npc.dialogue}"
            </p>
          </div>

          {npc.secondaryDialogue && (
            <p className="text-xs text-slate-300 leading-relaxed pl-6 pt-1 border-t border-slate-800/60">
              "{npc.secondaryDialogue}"
            </p>
          )}
        </div>

        {/* Secret Notification Badge */}
        {hasUnlockedSecret && (
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-800/50 text-xs text-cyan-300">
            <div className="flex items-center gap-1.5">
              <BookOpen className="w-4 h-4" />
              <span>Nova tajna zabilježena je u tvoj Dnevnik!</span>
            </div>
            {onOpenJournal && (
              <button
                type="button"
                onClick={() => {
                  soundSystem.playClick();
                  onClose();
                  onOpenJournal();
                }}
                className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold transition-colors"
              >
                Pregledaj
              </button>
            )}
          </div>
        )}

        {/* Close Button */}
        <div className="flex justify-end pt-1">
          <button
            type="button"
            onClick={() => {
              soundSystem.playClick();
              onClose();
            }}
            className="px-6 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold shadow-md active:scale-95 transition-all"
          >
            Razumijem
          </button>
        </div>
      </div>
    </div>
  );
};
