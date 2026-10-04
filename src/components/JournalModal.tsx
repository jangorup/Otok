/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, BookOpen, Compass, Sparkles, Key, HelpCircle } from 'lucide-react';
import { MAIN_QUEST, INITIAL_SECRETS, SecretItem } from '../game/storyData';

interface JournalModalProps {
  isOpen: boolean;
  discoveredSecretIds: string[];
  talkedToNpcCount: number;
  totalNpcCount: number;
  onClose: () => void;
}

export const JournalModal: React.FC<JournalModalProps> = ({
  isOpen,
  discoveredSecretIds,
  talkedToNpcCount,
  totalNpcCount,
  onClose,
}) => {
  if (!isOpen) return null;

  const discoveredSecrets: SecretItem[] = INITIAL_SECRETS.filter((s) =>
    discoveredSecretIds.includes(s.id)
  );

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-xs select-none touch-none animate-in fade-in duration-200"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl max-h-[90vh] bg-slate-900/95 border border-amber-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-amber-200 tracking-wide">
                Dnevnik Pustolova
              </h2>
              <p className="text-xs text-slate-400">
                Zapisi o otočju, kletvi i otkrivenim tajnama
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

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
          {/* Main Quest Goal Card */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950/90 to-slate-900/90 border border-amber-500/40 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                  Glavni Cilj
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                U tijeku
              </span>
            </div>

            <h3 className="font-heading font-bold text-base sm:text-lg text-slate-100 mb-1">
              {MAIN_QUEST.title}
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed mb-3">
              {MAIN_QUEST.description}
            </p>

            {/* Steps Checklist */}
            <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                Koraci istraživanja:
              </div>
              {MAIN_QUEST.steps.map((step) => {
                let isStepDone = step.completed;
                if (step.id === 'step_talk_villagers' && talkedToNpcCount >= totalNpcCount && totalNpcCount > 0) {
                  isStepDone = true;
                }
                return (
                  <div
                    key={step.id}
                    className="flex items-center gap-2 text-xs text-slate-200"
                  >
                    <div
                      className={`w-4 h-4 rounded-md flex items-center justify-center text-[10px] border ${
                        isStepDone
                          ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50'
                          : 'bg-slate-800 text-slate-500 border-slate-700'
                      }`}
                    >
                      {isStepDone ? '✓' : '○'}
                    </div>
                    <span className={isStepDone ? 'line-through text-slate-400' : 'text-slate-200'}>
                      {step.text}
                    </span>
                    {step.id === 'step_talk_villagers' && (
                      <span className="text-[11px] text-amber-400 font-medium ml-auto">
                        ({talkedToNpcCount}/{totalNpcCount})
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section: Otkrivene Tajne */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-cyan-400" />
                <h3 className="font-heading font-bold text-sm text-slate-100 uppercase tracking-wide">
                  Otkrivene tajne ({discoveredSecrets.length})
                </h3>
              </div>
              <span className="text-[11px] text-slate-400">
                Ukupno zabilješki: {discoveredSecrets.length}
              </span>
            </div>

            {discoveredSecrets.length === 0 ? (
              /* Empty State */
              <div className="p-6 rounded-2xl bg-slate-950/50 border border-slate-800 text-center space-y-2">
                <div className="w-10 h-10 mx-auto rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 text-lg">
                  📜
                </div>
                <div className="font-semibold text-xs text-slate-300">
                  Još nema otkrivenih tajni
                </div>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Istražuj otok i razgovaraj s preostalim otočanima (Starac Goran, Ribar Mate, Travarica Mara) kako bi otključao zabilješke o kletvi.
                </p>
              </div>
            ) : (
              /* Discovered Secrets List */
              <div className="space-y-2.5">
                {discoveredSecrets.map((secret) => (
                  <div
                    key={secret.id}
                    className="p-3.5 rounded-2xl bg-slate-950/60 border border-cyan-500/25 flex flex-col gap-1 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-cyan-300">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{secret.title}</span>
                      </div>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
                        {secret.category}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {secret.description}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Survival Lore Tips */}
          <div className="p-3.5 rounded-2xl bg-slate-950/40 border border-slate-800/70 text-xs text-slate-300 flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-semibold text-slate-200 block">
                Znanje o otočnoj kletvi:
              </span>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                • Noćni bičevi se pojavljuju kad padne mrak i plešu nad morskom površinom.<br />
                • Izgradi <strong className="text-amber-300">Utočište</strong> ili <strong className="text-amber-300">Kamenu kuću</strong> dalje od obale za siguran noćni zaklon.<br />
                • U budućim ekspedicijama očekuju se skrivene špilje, zagonetke drevnih i okolni otoci arhipelaga.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950/70 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            Zatvori dnevnik
          </button>
        </div>
      </div>
    </div>
  );
};
