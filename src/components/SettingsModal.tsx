import React, { useState } from 'react';
import { X, Volume2, VolumeX, RotateCcw, AlertTriangle, Home, HelpCircle, Sparkles, ZoomIn } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onNewGame: () => void;
  onOpenLobby?: () => void;
  onShowIntro?: () => void;
  onClose: () => void;
  zoomLevel?: number;
  onSetZoom?: (zoom: number) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  isMuted,
  onToggleMute,
  onNewGame,
  onOpenLobby,
  onShowIntro,
  onClose,
  zoomLevel = 1.55,
  onSetZoom,
}) => {
  const [confirmNewGame, setConfirmNewGame] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleStartNewGame = () => {
    onNewGame();
    setConfirmNewGame(false);
    onClose();
  };

  const handleGoToLobby = () => {
    if (onOpenLobby) {
      onOpenLobby();
      onClose();
    }
  };

  const handleShowIntroStory = () => {
    if (onShowIntro) {
      onShowIntro();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 bg-slate-950/75 backdrop-blur-xs select-none">
      <div className="relative w-full max-w-md bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-slate-800 bg-slate-950/40">
          <h2 className="font-heading font-bold text-base text-amber-200">
            Kletva Otoka - Postavke i Pomoć
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 max-h-[80vh] overflow-y-auto">
          {/* Lobby Option */}
          {onOpenLobby && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-500/15 text-sky-400">
                  <Home className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-200">
                    Glavni izbornik (Predvorje)
                  </div>
                  <div className="text-xs text-slate-400">
                    Promijeni svijet ili stvori novi otok
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoToLobby}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white transition-colors shadow-sm"
              >
                Otvori
              </button>
            </div>
          )}

          {/* Story Intro Replay */}
          {onShowIntro && (
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/15 text-cyan-400">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-200">
                    Uvodna priča (Kletva Otoka)
                  </div>
                  <div className="text-xs text-slate-400">
                    Ponovno pogledaj legendu o morskim bičevima
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleShowIntroStory}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-sm"
              >
                Pogledaj
              </button>
            </div>
          )}

          {/* Audio Setting */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/15 text-amber-400">
                {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
              </div>
              <div>
                <div className="text-sm font-semibold text-slate-200">
                  Glazba i zvučni efekti
                </div>
                <div className="text-xs text-slate-400">
                  Smirujući šum valova i otočne melodije
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={onToggleMute}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                isMuted
                  ? 'bg-rose-950/50 text-rose-300 border border-rose-800/40'
                  : 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40'
              }`}
            >
              {isMuted ? 'Isključeno' : 'Uključeno'}
            </button>
          </div>

          {/* Camera Zoom Setting (Closer for mobile) */}
          {onSetZoom && (
            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-sky-500/15 text-sky-400">
                  <ZoomIn className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-slate-200">
                    Udaljenost kamere (Zum)
                  </div>
                  <div className="text-xs text-slate-400">
                    Približava pogled za ugodnije igranje na mobitelu
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {[
                  { label: 'Udaljeno', val: 1.0, sub: '1.0x' },
                  { label: 'Srednje', val: 1.25, sub: '1.25x' },
                  { label: 'Blizu ★', val: 1.55, sub: '1.55x' },
                  { label: 'Vrlo blizu', val: 1.75, sub: '1.75x' },
                ].map((opt) => {
                  const isSelected = Math.abs(zoomLevel - opt.val) < 0.08;
                  return (
                    <button
                      key={opt.val}
                      type="button"
                      onClick={() => onSetZoom(opt.val)}
                      className={`py-2 px-1 rounded-lg text-center transition-all ${
                        isSelected
                          ? 'bg-cyan-600 text-white font-bold ring-2 ring-cyan-400 shadow-md scale-[1.02]'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/50'
                      }`}
                    >
                      <div className="text-xs font-semibold">{opt.label}</div>
                      <div className="text-[10px] opacity-75">{opt.sub}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* How to play / info */}
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-1.5 font-semibold text-amber-300">
              <HelpCircle className="w-4 h-4" />
              <span>Vodič kroz otok:</span>
            </div>
            <ul className="space-y-1.5 list-disc list-inside text-slate-300">
              <li>
                <strong className="text-slate-100">Kretanje:</strong> Virtualni joystick lijevo ili tipke WASD / strelice na tipkovnici.
              </li>
              <li>
                <strong className="text-slate-100">Razgovor s otočanima:</strong> Priđi Starcu Goranu, Ribaru Mati ili Travarici Mari i pritisni gumb <strong className="text-cyan-300">Pričaj</strong> ili ih dodirni na ekranu.
              </li>
              <li>
                <strong className="text-slate-100">Dnevnik:</strong> Otvori gumb <strong className="text-cyan-300">Dnevnik</strong> gore desno za pregled glavnog cilja i zabilježenih tajni.
              </li>
              <li>
                <strong className="text-slate-100">Noćni morski bičevi:</strong> Noću se iz mora uzdižu svjetlucavi bičevi. Za sada su to misteriozni vizualni znakovi kletve.
              </li>
              <li>
                <strong className="text-slate-100">Utočišta i Gradnja:</strong> Sakupljaj drvo, kamen i vlakna te izgradi <strong className="text-amber-300">Utočište</strong> za siguran zaklon.
              </li>
            </ul>
          </div>

          {/* New Game Section */}
          <div className="p-3 rounded-xl bg-slate-800/40 border border-slate-700/40">
            {!confirmNewGame ? (
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-slate-200">
                    Resetiraj trenutni otok
                  </div>
                  <div className="text-xs text-slate-400">
                    Započni novu avanturu na ovom otoku
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setConfirmNewGame(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-700 text-xs font-semibold transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Resetiraj</span>
                </button>
              </div>
            ) : (
              <div className="p-2 space-y-2 bg-rose-950/30 rounded-lg border border-rose-900/50">
                <div className="flex items-center gap-2 text-rose-300 text-xs font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Sigurno želiš resetirati ovaj otok? Sav napredak na njemu bit će obrisan!</span>
                </div>
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setConfirmNewGame(false)}
                    className="px-3 py-1 text-xs rounded-md bg-slate-800 text-slate-300 hover:bg-slate-700"
                  >
                    Odustani
                  </button>
                  <button
                    type="button"
                    onClick={handleStartNewGame}
                    className="px-3 py-1 text-xs rounded-md bg-rose-600 hover:bg-rose-500 text-white font-semibold shadow-sm"
                  >
                    Da, resetiraj
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
