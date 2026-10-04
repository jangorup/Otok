import React from 'react';
import { X, Hammer, Check, AlertCircle } from 'lucide-react';
import { BUILDINGS } from '../game/constants';
import { BuildingType, Inventory } from '../game/types';

interface BuildModalProps {
  isOpen: boolean;
  inventory: Inventory;
  onSelectBuilding: (type: BuildingType) => void;
  onClose: () => void;
}

export const BuildModal: React.FC<BuildModalProps> = ({
  isOpen,
  inventory,
  onSelectBuilding,
  onClose,
}) => {
  if (!isOpen) return null;

  const buildingsList = Object.values(BUILDINGS);

  const checkAffordable = (cost: typeof buildingsList[0]['cost']) => {
    if (cost.wood && inventory.wood < cost.wood) return false;
    if (cost.stone && inventory.stone < cost.stone) return false;
    if (cost.fibre && inventory.fibre < cost.fibre) return false;
    if (cost.shells && inventory.shells < cost.shells) return false;
    if (cost.sand && inventory.sand < cost.sand) return false;
    return true;
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/40">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Hammer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading font-bold text-lg text-amber-200">
                Utočišta i Gradnja
              </h2>
              <p className="text-xs text-slate-400">
                Sagradi sigurno sklonište od noćnih morskih bičeva
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

        {/* Buildings Grid */}
        <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3 overflow-y-auto">
          {buildingsList.map((b) => {
            const affordable = checkAffordable(b.cost);

            return (
              <div
                key={b.type}
                className={`relative flex flex-col justify-between p-3.5 rounded-xl border transition-all ${
                  affordable
                    ? 'bg-slate-800/80 border-slate-700 hover:border-amber-400/50 hover:bg-slate-800 shadow-md'
                    : 'bg-slate-900/40 border-slate-800/80 opacity-65'
                }`}
              >
                <div>
                  {/* Building Title & Visual Badge */}
                  <div className="flex items-center justify-between mb-1.5">
                    <h3 className="font-heading font-semibold text-sm text-slate-100">
                      {b.name}
                    </h3>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {b.width}x{b.height} polja
                    </span>
                  </div>

                  {/* Visual mini illustration box */}
                  <div className="w-full h-20 rounded-lg bg-slate-950/60 border border-slate-800/80 mb-2 flex items-center justify-center relative overflow-hidden">
                    {b.type === 'HUT' && (
                      <div className="flex flex-col items-center">
                        <div className="w-14 h-8 bg-amber-700/80 rounded-t-lg border-b-2 border-amber-900 flex items-center justify-center text-xs">
                          ⛺
                        </div>
                        <div className="w-10 h-6 bg-amber-900/90 rounded-b flex items-center justify-center">
                          <div className="w-3 h-4 bg-amber-950 rounded-t-xs" />
                        </div>
                      </div>
                    )}
                    {b.type === 'STONE_HOUSE' && (
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-8 bg-orange-700 rounded-t-lg border-b-2 border-orange-950 flex items-center justify-center text-xs">
                          🏠
                        </div>
                        <div className="w-12 h-6 bg-slate-200 rounded-b flex items-center justify-between px-1.5">
                          <div className="w-2.5 h-3 bg-sky-500 rounded-xs" />
                          <div className="w-3 h-4 bg-amber-950 rounded-t-xs" />
                        </div>
                      </div>
                    )}
                    {b.type === 'BEACH_COTTAGE' && (
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-8 bg-sky-700 rounded-t-lg flex items-center justify-center text-xs">
                          🏖️
                        </div>
                        <div className="w-14 h-6 bg-sky-200 rounded-b flex items-center justify-center gap-1">
                          <div className="w-2.5 h-3 bg-amber-400 rounded-xs" />
                          <div className="w-2.5 h-3 bg-amber-400 rounded-xs" />
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="text-[11px] text-slate-300 leading-snug mb-3">
                    {b.description}
                  </p>
                </div>

                <div>
                  {/* Cost checklist */}
                  <div className="space-y-1 mb-3 pt-2 border-t border-slate-700/50">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      Potrebni materijali:
                    </span>
                    <div className="grid grid-cols-2 gap-1 text-[11px]">
                      {b.cost.wood !== undefined && (
                        <div
                          className={`flex items-center justify-between px-2 py-0.5 rounded ${
                            inventory.wood >= b.cost.wood
                              ? 'bg-emerald-950/30 text-emerald-300'
                              : 'bg-rose-950/30 text-rose-300'
                          }`}
                        >
                          <span>Drvo:</span>
                          <span className="font-semibold tabular-nums">
                            {inventory.wood}/{b.cost.wood}
                          </span>
                        </div>
                      )}
                      {b.cost.stone !== undefined && (
                        <div
                          className={`flex items-center justify-between px-2 py-0.5 rounded ${
                            inventory.stone >= b.cost.stone
                              ? 'bg-emerald-950/30 text-emerald-300'
                              : 'bg-rose-950/30 text-rose-300'
                          }`}
                        >
                          <span>Kamen:</span>
                          <span className="font-semibold tabular-nums">
                            {inventory.stone}/{b.cost.stone}
                          </span>
                        </div>
                      )}
                      {b.cost.fibre !== undefined && (
                        <div
                          className={`flex items-center justify-between px-2 py-0.5 rounded ${
                            inventory.fibre >= b.cost.fibre
                              ? 'bg-emerald-950/30 text-emerald-300'
                              : 'bg-rose-950/30 text-rose-300'
                          }`}
                        >
                          <span>Vlakna:</span>
                          <span className="font-semibold tabular-nums">
                            {inventory.fibre}/{b.cost.fibre}
                          </span>
                        </div>
                      )}
                      {b.cost.shells !== undefined && (
                        <div
                          className={`flex items-center justify-between px-2 py-0.5 rounded ${
                            inventory.shells >= b.cost.shells
                              ? 'bg-emerald-950/30 text-emerald-300'
                              : 'bg-rose-950/30 text-rose-300'
                          }`}
                        >
                          <span>Školjke:</span>
                          <span className="font-semibold tabular-nums">
                            {inventory.shells}/{b.cost.shells}
                          </span>
                        </div>
                      )}
                      {b.cost.sand !== undefined && (
                        <div
                          className={`flex items-center justify-between px-2 py-0.5 rounded ${
                            inventory.sand >= b.cost.sand
                              ? 'bg-emerald-950/30 text-emerald-300'
                              : 'bg-rose-950/30 text-rose-300'
                          }`}
                        >
                          <span>Pijesak:</span>
                          <span className="font-semibold tabular-nums">
                            {inventory.sand}/{b.cost.sand}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Select button */}
                  <button
                    type="button"
                    disabled={!affordable}
                    onClick={() => {
                      onSelectBuilding(b.type);
                      onClose();
                    }}
                    className={`w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                      affordable
                        ? 'bg-amber-500 hover:bg-amber-400 active:scale-98 text-slate-950 shadow-md'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    }`}
                  >
                    {affordable ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Postavi na otok</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Nedostaje materijala</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
