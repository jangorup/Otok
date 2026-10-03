import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Play,
  Trash2,
  Compass,
  Home,
  Package,
  Volume2,
  VolumeX,
  Sparkles,
  Dices,
  ArrowLeft,
  AlertTriangle,
  User,
  Heart,
  Palette,
} from 'lucide-react';
import { WorldMeta, CharacterCustomization, PetType } from '../game/types';
import { getAllWorlds, createNewWorld, deleteWorld } from '../game/storage';
import { soundSystem } from '../game/audio';
import { PET_INFO, DEFAULT_CHARACTER } from '../game/constants';

interface LobbyProps {
  onSelectWorld: (worldId: string) => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

const DEFAULT_ISLAND_NAMES = [
  'Otok Maslina',
  'Sunčani Otok',
  'Otok Smokva',
  'Zlatni Žal',
  'Mirna Uvala',
  'Otok Lavande',
  'Plavi Biser',
  'Tirkizni Otok',
  'Otok Galebova',
  'Borova Uvala',
];

const DEFAULT_CHARACTER_NAMES = [
  'Luka',
  'Ana',
  'Miro',
  'Sara',
  'Ivan',
  'Elena',
  'Marko',
  'Maja',
  'Petar',
  'Nika',
];

const SKIN_COLORS = [
  { label: 'Svijetla', color: '#fed7aa' },
  { label: 'Zlatna', color: '#fcd34d' },
  { label: 'Preplanula', color: '#d97706' },
  { label: 'Tamna', color: '#854d0e' },
  { label: 'Nježna', color: '#fbcfe8' },
];

const HAIR_COLORS = [
  { label: 'Kestenjasta', color: '#451a03' },
  { label: 'Crna', color: '#1e293b' },
  { label: 'Zlatna', color: '#d97706' },
  { label: 'Srebrna', color: '#94a3b8' },
  { label: 'Riđa', color: '#b91c1c' },
];

const SHIRT_COLORS = [
  { label: 'Tirkizna', color: '#0d9488' },
  { label: 'Terakota', color: '#ea580c' },
  { label: 'More', color: '#0284c7' },
  { label: 'Lavanda', color: '#8b5cf6' },
  { label: 'Koraljna', color: '#e11d48' },
  { label: 'Maslina', color: '#16a34a' },
];

const HAT_OPTIONS: { id: CharacterCustomization['hatType']; label: string; icon: string }[] = [
  { id: 'STRAW_HAT', label: 'Slamnati šešir', icon: '👒' },
  { id: 'CAP', label: 'Mornarska kapa', icon: '🧢' },
  { id: 'FLOWER', label: 'Cvjetni vijenac', icon: '🌸' },
  { id: 'NONE', label: 'Bez šešira', icon: '👤' },
];

const HAIR_STYLES: { id: CharacterCustomization['hairStyle']; label: string }[] = [
  { id: 'SHORT', label: 'Kratka' },
  { id: 'LONG', label: 'Duga' },
  { id: 'CURLY', label: 'Kovrčava' },
  { id: 'BAND', label: 'Traka' },
  { id: 'NONE', label: 'Bez kose' },
];

export const Lobby: React.FC<LobbyProps> = ({
  onSelectWorld,
  isMuted,
  onToggleMute,
}) => {
  const [worlds, setWorlds] = useState<WorldMeta[]>([]);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [creationTab, setCreationTab] = useState<'ISLAND' | 'CHARACTER' | 'PET'>('ISLAND');

  // Creation State
  const [newWorldName, setNewWorldName] = useState<string>('');
  const [newWorldSeed, setNewWorldSeed] = useState<number>(() => Math.floor(Math.random() * 90000) + 10000);

  const [character, setCharacter] = useState<CharacterCustomization>({
    ...DEFAULT_CHARACTER,
    name: 'Luka',
  });

  const [selectedPetType, setSelectedPetType] = useState<PetType>('DOG');
  const [petName, setPetName] = useState<string>('Bobi');

  const [worldToDelete, setWorldToDelete] = useState<WorldMeta | null>(null);

  // Live Canvas Preview for Character and Pet
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const refreshWorlds = () => {
    const list = getAllWorlds();
    setWorlds(list);
  };

  useEffect(() => {
    refreshWorlds();
  }, []);

  const handleStartCreate = () => {
    soundSystem.unlock();
    soundSystem.playClick();
    const randomWorldName = DEFAULT_ISLAND_NAMES[Math.floor(Math.random() * DEFAULT_ISLAND_NAMES.length)];
    const randomCharName = DEFAULT_CHARACTER_NAMES[Math.floor(Math.random() * DEFAULT_CHARACTER_NAMES.length)];

    setNewWorldName(randomWorldName);
    setNewWorldSeed(Math.floor(Math.random() * 90000) + 10000);
    setCharacter({
      ...DEFAULT_CHARACTER,
      name: randomCharName,
    });
    setSelectedPetType('DOG');
    setPetName('Bobi');
    setCreationTab('ISLAND');
    setIsCreating(true);
  };

  const handleRerollWorldName = () => {
    soundSystem.unlock();
    soundSystem.playClick();
    const randomName = DEFAULT_ISLAND_NAMES[Math.floor(Math.random() * DEFAULT_ISLAND_NAMES.length)];
    setNewWorldName(randomName);
    setNewWorldSeed(Math.floor(Math.random() * 90000) + 10000);
  };

  const handleRerollCharName = () => {
    soundSystem.unlock();
    soundSystem.playClick();
    const randomName = DEFAULT_CHARACTER_NAMES[Math.floor(Math.random() * DEFAULT_CHARACTER_NAMES.length)];
    setCharacter((prev) => ({ ...prev, name: randomName }));
  };

  const handleSelectPetType = (type: PetType) => {
    soundSystem.unlock();
    soundSystem.playPetSound(type);
    setSelectedPetType(type);
    setPetName(PET_INFO[type].defaultName);
  };

  const handleConfirmCreate = (e: React.FormEvent) => {
    e.preventDefault();
    soundSystem.unlock();
    soundSystem.playBuild();

    const name = newWorldName.trim() || 'Mirni Otok';
    const finalChar = {
      ...character,
      name: character.name.trim() || 'Otočan',
    };
    const finalPet = {
      type: selectedPetType,
      name: petName.trim() || PET_INFO[selectedPetType].defaultName,
    };

    const newWorld = createNewWorld(name, newWorldSeed, finalChar, finalPet);
    refreshWorlds();
    setIsCreating(false);
    onSelectWorld(newWorld.worldId!);
  };

  const handleDeleteWorld = (world: WorldMeta) => {
    soundSystem.unlock();
    soundSystem.playClick();
    deleteWorld(world.id);
    setWorldToDelete(null);
    refreshWorlds();
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'Upravo sada';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `Prije ${minutes} min`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `Prije ${hours} h`;
    const days = Math.floor(hours / 24);
    return `Prije ${days} d`;
  };

  // Render Mini Preview Canvas
  useEffect(() => {
    if (!isCreating) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Warm sand/grass background circle
    ctx.fillStyle = '#5c9646';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Soft patch
    ctx.fillStyle = '#e8c988';
    ctx.beginPath();
    ctx.ellipse(canvas.width / 2, canvas.height - 18, 55, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    // Player position
    const px = canvas.width / 2 - 14;
    const py = canvas.height / 2 + 10;

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(px, py + 16, 10, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pants
    ctx.fillStyle = character.pantsColor;
    ctx.fillRect(px - 6, py + 6, 12, 9);
    // Shoes
    ctx.fillStyle = '#5c3a21';
    ctx.fillRect(px - 6, py + 14, 5, 4);
    ctx.fillRect(px + 1, py + 14, 5, 4);

    // Shirt
    ctx.fillStyle = character.shirtColor;
    ctx.fillRect(px - 7, py - 6, 14, 13);
    // Arms
    ctx.fillStyle = character.skinColor;
    ctx.fillRect(px - 9, py - 2, 3, 6);
    ctx.fillRect(px + 6, py - 2, 3, 6);

    // Head
    const headY = py - 13;
    ctx.fillStyle = character.skinColor;
    ctx.beginPath();
    ctx.arc(px, headY, 6, 0, Math.PI * 2);
    ctx.fill();

    // Eyes
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(px - 3, headY - 1, 2, 2);
    ctx.fillRect(px + 1, headY - 1, 2, 2);

    // Hair
    if (character.hairStyle !== 'NONE') {
      ctx.fillStyle = character.hairColor;
      if (character.hairStyle === 'SHORT') {
        ctx.beginPath();
        ctx.arc(px, headY - 2, 7, Math.PI, 0);
        ctx.fill();
      } else if (character.hairStyle === 'LONG') {
        ctx.beginPath();
        ctx.arc(px, headY - 2, 7, Math.PI, 0);
        ctx.lineTo(px + 7, headY + 8);
        ctx.lineTo(px - 7, headY + 8);
        ctx.fill();
      } else if (character.hairStyle === 'CURLY') {
        ctx.beginPath();
        ctx.arc(px - 4, headY - 4, 4, 0, Math.PI * 2);
        ctx.arc(px + 4, headY - 4, 4, 0, Math.PI * 2);
        ctx.arc(px, headY - 6, 4.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (character.hairStyle === 'BAND') {
        ctx.beginPath();
        ctx.arc(px, headY - 2, 7, Math.PI, 0);
        ctx.fill();
        ctx.fillStyle = '#ef4444';
        ctx.fillRect(px - 6, headY - 3, 12, 2.5);
      }
    }

    // Hat
    const hatY = headY - 4;
    if (character.hatType === 'STRAW_HAT') {
      ctx.fillStyle = '#eab308';
      ctx.beginPath();
      ctx.ellipse(px, hatY + 1, 12, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fde047';
      ctx.beginPath();
      ctx.ellipse(px, hatY - 2, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#dc2626';
      ctx.fillRect(px - 6, hatY - 1, 12, 2);
    } else if (character.hatType === 'CAP') {
      ctx.fillStyle = '#1e3a5f';
      ctx.beginPath();
      ctx.ellipse(px, hatY - 1, 8, 4.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(px, hatY + 1, 9, 2.5);
    } else if (character.hatType === 'FLOWER') {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(px - 4, hatY + 1, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#c084fc';
      ctx.beginPath();
      ctx.arc(px + 3, hatY, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Pet position next to player
    const petX = canvas.width / 2 + 20;
    const petY = py + 4;

    // Pet shadow
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(petX, petY + 7, selectedPetType === 'HAMSTER' ? 5 : 8, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Render pet preview
    if (selectedPetType === 'DOG') {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(petX - 7, petY - 4, 14, 9, 4);
      ctx.fill();
      // head
      ctx.beginPath();
      ctx.arc(petX + 6, petY - 5, 5.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#b45309';
      ctx.beginPath();
      ctx.ellipse(petX + 4, petY - 7, 2.5, 4, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(petX + 8, petY - 5, 1.5, 1.5);
    } else if (selectedPetType === 'CAT') {
      ctx.fillStyle = '#f97316';
      ctx.beginPath();
      ctx.roundRect(petX - 6, petY - 3, 12, 8, 4);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(petX + 5, petY - 4, 5, 0, Math.PI * 2);
      ctx.fill();
      // ears
      ctx.fillStyle = '#ea580c';
      ctx.beginPath();
      ctx.moveTo(petX + 2, petY - 7);
      ctx.lineTo(petX + 4, petY - 11);
      ctx.lineTo(petX + 6, petY - 7);
      ctx.fill();
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(petX + 6, petY - 5, 1.5, 1.5);
    } else if (selectedPetType === 'RABBIT') {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.roundRect(petX - 6, petY - 3, 12, 8, 4);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(petX + 4, petY - 3, 4.5, 0, Math.PI * 2);
      ctx.fill();
      // ears
      ctx.fillStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.roundRect(petX + 2, petY - 11, 2.5, 7, 1);
      ctx.fill();
      ctx.fillStyle = '#f43f5e';
      ctx.fillRect(petX + 6, petY - 2.5, 1.5, 1.5);
    } else if (selectedPetType === 'PARROT') {
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.ellipse(petX, petY - 4, 5, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.roundRect(petX - 3, petY - 5, 5, 7, 2);
      ctx.fill();
      ctx.fillStyle = '#f59e0b';
      ctx.fillRect(petX + 4, petY - 6, 3, 2);
    } else if (selectedPetType === 'HAMSTER') {
      ctx.fillStyle = '#d97706';
      ctx.beginPath();
      ctx.ellipse(petX, petY + 2, 6, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fef08a';
      ctx.beginPath();
      ctx.ellipse(petX, petY + 3, 4, 3, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }, [isCreating, character, selectedPetType]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gradient-to-b from-[#16314f] via-[#1e3a5f] to-[#0f172a] text-slate-100 flex flex-col items-center justify-between p-3 sm:p-5 select-none touch-none">
      {/* Background Ambience */}
      <div className="absolute inset-0 pointer-events-none opacity-20 overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-sky-400/20 blur-3xl" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 rounded-full bg-amber-400/15 blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-4xl flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-amber-400/20 border border-amber-400/40 flex items-center justify-center text-amber-300 shadow-lg">
            <Sparkles className="w-5 h-5 animate-pulse-subtle" />
          </div>
          <div>
            <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-wide text-amber-100 drop-shadow-sm">
              Mirni Otok
            </h1>
            <p className="text-[10px] sm:text-xs text-sky-200/80 font-medium">
              Tvoja opuštajuća mediteranska oaza
            </p>
          </div>
        </div>

        {/* Audio Toggle */}
        <button
          type="button"
          onClick={() => {
            soundSystem.unlock();
            onToggleMute();
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/60 hover:bg-slate-800 text-slate-200 border border-white/15 backdrop-blur-xs text-xs font-semibold shadow-md active:scale-95 transition-all"
        >
          {isMuted ? (
            <>
              <VolumeX className="w-4 h-4 text-rose-400" />
              <span className="hidden sm:inline">Zvuk isključen</span>
            </>
          ) : (
            <>
              <Volume2 className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Zvuk uključen</span>
            </>
          )}
        </button>
      </header>

      {/* Main Content */}
      <div className="relative z-10 w-full max-w-4xl flex-1 flex flex-col justify-center my-2 overflow-hidden">
        {isCreating ? (
          /* CREATE WORLD & CHARACTER & PET WIZARD */
          <div className="w-full max-w-3xl mx-auto bg-slate-900/90 backdrop-blur-md border border-amber-400/30 rounded-3xl p-4 sm:p-5 shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
            {/* Top Bar with Tabs and Live Preview */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Natrag na svjetove</span>
              </button>

              {/* Step Navigation Tabs */}
              <div className="flex items-center gap-1 p-1 bg-slate-950/60 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setCreationTab('ISLAND')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    creationTab === 'ISLAND'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>1. Otok</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreationTab('CHARACTER')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    creationTab === 'CHARACTER'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>2. Moj Lik</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCreationTab('PET')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    creationTab === 'PET'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5" />
                  <span>3. Ljubimac</span>
                </button>
              </div>

              {/* Live Mini Preview Box */}
              <div className="flex items-center gap-2">
                <canvas
                  ref={previewCanvasRef}
                  width={110}
                  height={56}
                  className="rounded-xl border border-slate-700 shadow-inner bg-slate-950"
                  title="Pregled lika i ljubimca"
                />
              </div>
            </div>

            {/* Tab Panels */}
            <form onSubmit={handleConfirmCreate} className="flex-1 flex flex-col justify-between overflow-y-auto py-3">
              {/* TAB 1: ISLAND */}
              {creationTab === 'ISLAND' && (
                <div className="space-y-3.5 max-w-lg mx-auto w-full">
                  <div>
                    <h2 className="font-heading font-bold text-lg text-amber-200">
                      Nazovi svoj novi otok
                    </h2>
                    <p className="text-xs text-slate-300">
                      Svaki otok ima vlastite prirodne uvale, pješčane plaže i resursi se automatski spremaju.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Naziv otoka
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newWorldName}
                        onChange={(e) => setNewWorldName(e.target.value)}
                        maxLength={28}
                        required
                        placeholder="npr. Sunčani Otok"
                        className="flex-1 bg-slate-950/70 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition-colors"
                      />
                      <button
                        type="button"
                        onClick={handleRerollWorldName}
                        title="Nasumični naziv"
                        className="px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center justify-center transition-colors active:scale-95"
                      >
                        <Dices className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between text-xs">
                    <span className="text-slate-400">Jedinstveno sjeme otoka (seed):</span>
                    <span className="font-mono text-amber-400 font-semibold">#{newWorldSeed}</span>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={() => setCreationTab('CHARACTER')}
                      className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all"
                    >
                      Dalje: Prilagodi Lika →
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: CHARACTER CUSTOMIZATION */}
              {creationTab === 'CHARACTER' && (
                <div className="space-y-3 max-w-xl mx-auto w-full text-xs">
                  {/* Character Name */}
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1">
                      Ime lika
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={character.name}
                        onChange={(e) => setCharacter({ ...character, name: e.target.value })}
                        maxLength={20}
                        required
                        placeholder="Ime tvog otočana"
                        className="flex-1 bg-slate-950/70 border border-slate-700 focus:border-amber-400 rounded-xl px-3.5 py-1.5 text-sm text-slate-100 outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleRerollCharName}
                        title="Nasumično ime"
                        className="px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center justify-center transition-colors active:scale-95"
                      >
                        <Dices className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Skin Tone & Hair Color */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Skin Color */}
                    <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                      <span className="font-semibold text-slate-300 block mb-1.5">Boja kože</span>
                      <div className="flex items-center gap-2">
                        {SKIN_COLORS.map((s) => (
                          <button
                            key={s.color}
                            type="button"
                            onClick={() => setCharacter({ ...character, skinColor: s.color })}
                            className={`w-7 h-7 rounded-full border-2 transition-transform ${
                              character.skinColor === s.color ? 'scale-115 border-amber-400 ring-2 ring-amber-400/40' : 'border-white/20'
                            }`}
                            style={{ backgroundColor: s.color }}
                            title={s.label}
                          />
                        ))}
                      </div>
                    </div>

                    {/* Hair Color */}
                    <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                      <span className="font-semibold text-slate-300 block mb-1.5">Boja kose</span>
                      <div className="flex items-center gap-2">
                        {HAIR_COLORS.map((h) => (
                          <button
                            key={h.color}
                            type="button"
                            onClick={() => setCharacter({ ...character, hairColor: h.color })}
                            className={`w-7 h-7 rounded-full border-2 transition-transform ${
                              character.hairColor === h.color ? 'scale-115 border-amber-400 ring-2 ring-amber-400/40' : 'border-white/20'
                            }`}
                            style={{ backgroundColor: h.color }}
                            title={h.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Hair Style & Shirt Color */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {/* Hair Style */}
                    <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                      <span className="font-semibold text-slate-300 block mb-1.5">Frizura</span>
                      <div className="flex flex-wrap gap-1">
                        {HAIR_STYLES.map((style) => (
                          <button
                            key={style.id}
                            type="button"
                            onClick={() => setCharacter({ ...character, hairStyle: style.id })}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                              character.hairStyle === style.id
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {style.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Shirt Color */}
                    <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                      <span className="font-semibold text-slate-300 block mb-1.5">Boja majice</span>
                      <div className="flex items-center gap-2">
                        {SHIRT_COLORS.map((c) => (
                          <button
                            key={c.color}
                            type="button"
                            onClick={() => setCharacter({ ...character, shirtColor: c.color })}
                            className={`w-7 h-7 rounded-full border-2 transition-transform ${
                              character.shirtColor === c.color ? 'scale-115 border-amber-400 ring-2 ring-amber-400/40' : 'border-white/20'
                            }`}
                            style={{ backgroundColor: c.color }}
                            title={c.label}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Hat / Headwear */}
                  <div className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800">
                    <span className="font-semibold text-slate-300 block mb-1.5">Pokrivalo za glavu</span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                      {HAT_OPTIONS.map((hat) => (
                        <button
                          key={hat.id}
                          type="button"
                          onClick={() => setCharacter({ ...character, hatType: hat.id })}
                          className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-left transition-all ${
                            character.hatType === hat.id
                              ? 'bg-amber-500/20 border-amber-400 text-amber-200'
                              : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                          }`}
                        >
                          <span className="text-base">{hat.icon}</span>
                          <span className="text-[11px] truncate">{hat.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-1 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setCreationTab('ISLAND')}
                      className="text-slate-400 hover:text-white"
                    >
                      ← Natrag na Otok
                    </button>
                    <button
                      type="button"
                      onClick={() => setCreationTab('PET')}
                      className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all"
                    >
                      Dalje: Odaberi Ljubimca →
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 3: PET SELECTION (Pas, Mačka, Zec, Papiga, Hrčak) */}
              {creationTab === 'PET' && (
                <div className="space-y-3 max-w-xl mx-auto w-full text-xs">
                  <div>
                    <h2 className="font-heading font-bold text-lg text-amber-200">
                      Odaberi svog otočnog ljubimca
                    </h2>
                    <p className="text-slate-300 text-xs">
                      Tvoj ljubimac će te vjerno pratiti kamo god ideš po otoku i veselo reagirati kada ga pomaziš!
                    </p>
                  </div>

                  {/* Pet Choice Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(Object.keys(PET_INFO) as PetType[]).map((type) => {
                      const pet = PET_INFO[type];
                      const isSelected = selectedPetType === type;
                      return (
                        <button
                          key={type}
                          type="button"
                          onClick={() => handleSelectPetType(type)}
                          className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all ${
                            isSelected
                              ? 'bg-amber-500/25 border-amber-400 shadow-lg shadow-amber-500/20 scale-102'
                              : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40 opacity-80'
                          }`}
                        >
                          <span className="text-3xl mb-1">{pet.icon}</span>
                          <span className={`font-bold text-xs ${isSelected ? 'text-amber-200' : 'text-slate-200'}`}>
                            {pet.name}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Selected Pet Description & Name */}
                  <div className="p-3 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 font-bold text-amber-300 mb-0.5">
                        <span>{PET_INFO[selectedPetType].icon}</span>
                        <span>{PET_INFO[selectedPetType].name}</span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {PET_INFO[selectedPetType].description}
                      </p>
                    </div>

                    <div className="w-full sm:w-52">
                      <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                        Ime ljubimca
                      </label>
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          value={petName}
                          onChange={(e) => setPetName(e.target.value)}
                          maxLength={16}
                          required
                          placeholder={PET_INFO[selectedPetType].defaultName}
                          className="flex-1 bg-slate-900 border border-slate-700 focus:border-amber-400 rounded-xl px-2.5 py-1.5 text-xs text-slate-100 outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => setPetName(PET_INFO[selectedPetType].defaultName)}
                          title="Izvorno ime"
                          className="px-2 rounded-xl bg-slate-800 text-amber-300 border border-slate-700 text-xs font-semibold"
                        >
                          Reset
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Final Submit Buttons */}
                  <div className="pt-2 flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCreationTab('CHARACTER')}
                      className="text-slate-400 hover:text-white"
                    >
                      ← Natrag na Lika
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-xl shadow-amber-500/25 active:scale-98 transition-all flex items-center gap-2"
                    >
                      <Play className="w-4 h-4 fill-slate-950" />
                      <span>Stvori svijet i igraj</span>
                    </button>
                  </div>
                </div>
              )}
            </form>
          </div>
        ) : (
          /* WORLDS LIST */
          <div className="h-full flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <div>
                <h2 className="font-heading font-bold text-lg sm:text-xl text-slate-100">
                  Tvoji svjetovi
                </h2>
                <p className="text-[11px] sm:text-xs text-slate-300">
                  Odaberi spremljeni otok ili stvori novi svijet
                </p>
              </div>

              <button
                type="button"
                onClick={handleStartCreate}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Novi svijet</span>
              </button>
            </div>

            {/* List of World Cards */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2.5 max-h-[58vh]">
              {worlds.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-900/60 border border-dashed border-slate-700 text-center">
                  <Compass className="w-10 h-10 text-amber-400/80 mb-2 animate-bounce" style={{ animationDuration: '3s' }} />
                  <p className="text-sm font-semibold text-slate-200 mb-1">
                    Nema još stvorenih svjetova
                  </p>
                  <p className="text-xs text-slate-400 max-w-xs mb-3">
                    Stvori svoj prvi mirni mediteranski otok i započni istraživanje sa svojim ljubimcem.
                  </p>
                  <button
                    type="button"
                    onClick={handleStartCreate}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition-all"
                  >
                    Stvori prvi otok
                  </button>
                </div>
              ) : (
                worlds.map((w) => {
                  const petIcon = w.petType ? PET_INFO[w.petType]?.icon || '🐶' : '🐶';
                  const petDisplay = w.petName ? `${petIcon} ${w.petName}` : null;

                  return (
                    <div
                      key={w.id}
                      className="group relative flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-slate-900/75 hover:bg-slate-900/95 border border-slate-700/80 hover:border-amber-400/50 backdrop-blur-xs transition-all shadow-md"
                    >
                      {/* World Info */}
                      <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-heading font-bold text-base text-amber-200 truncate">
                            {w.name}
                          </h3>
                          {w.characterName && (
                            <span className="text-[11px] text-slate-300 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                              👤 {w.characterName}
                            </span>
                          )}
                          {petDisplay && (
                            <span className="text-[11px] text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-900/50">
                              {petDisplay}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 shrink-0 ml-auto sm:ml-2">
                            {formatTimeAgo(w.lastPlayedAt)}
                          </span>
                        </div>

                        {/* Stats Badges */}
                        <div className="flex items-center gap-3 text-[11px] text-slate-300">
                          <div className="flex items-center gap-1" title="Sagrađene kućice">
                            <Home className="w-3.5 h-3.5 text-orange-400" />
                            <span className="tabular-nums font-semibold">{w.buildingCount}</span>
                            <span className="text-slate-400 text-[10px]">kućica</span>
                          </div>
                          <div className="flex items-center gap-1" title="Otkriveni otok">
                            <Compass className="w-3.5 h-3.5 text-sky-400" />
                            <span className="tabular-nums font-semibold">{w.revealedPercent}%</span>
                            <span className="text-slate-400 text-[10px]">istraženo</span>
                          </div>
                          <div className="flex items-center gap-1" title="Ukupno prikupljeno resursa">
                            <Package className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="tabular-nums font-semibold">{w.totalMaterials}</span>
                            <span className="text-slate-400 text-[10px]">resursa</span>
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setWorldToDelete(w)}
                          title="Obriši svijet"
                          className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-transparent hover:border-rose-900/50 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            soundSystem.unlock();
                            soundSystem.playClick();
                            onSelectWorld(w.id);
                          }}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Igraj</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete World Confirmation Dialog */}
      {worldToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs select-none">
          <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-rose-800/60 p-5 shadow-2xl text-slate-100">
            <div className="flex items-center gap-2.5 text-rose-400 mb-3">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <h3 className="font-heading font-bold text-base text-rose-200">
                Obriši svijet?
              </h3>
            </div>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Jesi li siguran da želiš obrisati svijet <strong className="text-white">"{worldToDelete.name}"</strong>? Sav napredak na tom otoku bit će trajno obrisan.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setWorldToDelete(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Odustani
              </button>
              <button
                type="button"
                onClick={() => handleDeleteWorld(worldToDelete)}
                className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md transition-colors"
              >
                Da, obriši
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 w-full max-w-4xl flex items-center justify-between text-[11px] text-slate-400/80 pt-1 border-t border-slate-800/60">
        <span>Svi svjetovi, likovi i ljubimci se automatski spremaju.</span>
        <span>Mirni Otok v1.3</span>
      </footer>
    </div>
  );
};
