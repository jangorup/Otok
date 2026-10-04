/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ChevronRight, Sparkles, X } from 'lucide-react';
import { INTRO_SLIDES } from '../game/storyData';
import { soundSystem } from '../game/audio';

interface StoryIntroModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export const StoryIntroModal: React.FC<StoryIntroModalProps> = ({
  isOpen,
  onComplete,
}) => {
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);

  if (!isOpen) return null;

  const currentSlide = INTRO_SLIDES[currentSlideIndex];
  const isLast = currentSlideIndex === INTRO_SLIDES.length - 1;

  const handleNext = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    soundSystem.playClick();
    if (isLast) {
      onComplete();
    } else {
      setCurrentSlideIndex((prev) => Math.min(prev + 1, INTRO_SLIDES.length - 1));
    }
  };

  const handleSkip = (e: React.MouseEvent) => {
    e.stopPropagation();
    soundSystem.playClick();
    onComplete();
  };

  return (
    <div
      onClick={() => handleNext()}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md select-none touch-none cursor-pointer transition-opacity animate-in fade-in duration-300"
    >
      {/* Mystical Background Atmospheric Glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-cyan-600/15 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-purple-600/15 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-amber-500/10 blur-3xl" />
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-5 sm:p-7 shadow-2xl shadow-cyan-950/50 flex flex-col justify-between overflow-hidden cursor-default"
      >
        {/* Top bar: Badge and Skip */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold tracking-wider uppercase">
              {currentSlide.badge}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {currentSlideIndex + 1} od {INTRO_SLIDES.length}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSkip}
            className="flex items-center gap-1 px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold transition-all active:scale-95"
            title="Preskoči uvodnu priču"
          >
            <span>Preskoči</span>
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Story Slide Content */}
        <div className="space-y-4 my-2">
          {/* Visual Icon Art Card */}
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-gradient-to-br from-slate-800 to-slate-950 border border-cyan-400/30 flex items-center justify-center text-4xl sm:text-5xl shadow-lg shadow-cyan-500/10">
            {currentSlide.icon}
          </div>

          {/* Titles */}
          <div className="text-center">
            <h2 className="font-heading font-bold text-xl sm:text-2xl text-amber-200 tracking-wide">
              {currentSlide.title}
            </h2>
            <p className="text-xs sm:text-sm text-cyan-200/80 font-medium mt-0.5">
              {currentSlide.subtitle}
            </p>
          </div>

          {/* Story Narrative Text */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans text-center sm:text-left">
              {currentSlide.text}
            </p>
          </div>
        </div>

        {/* Footer: Progress Dots & Action Button */}
        <div className="pt-4 mt-2 border-t border-slate-800/80 flex items-center justify-between">
          {/* Progress Indicators */}
          <div className="flex items-center gap-1.5">
            {INTRO_SLIDES.map((s, idx) => (
              <button
                key={s.id}
                type="button"
                onClick={() => {
                  soundSystem.playClick();
                  setCurrentSlideIndex(idx);
                }}
                className={`h-2 rounded-full transition-all ${
                  idx === currentSlideIndex
                    ? 'w-7 bg-cyan-400'
                    : 'w-2 bg-slate-700 hover:bg-slate-600'
                }`}
                title={`Slajd ${idx + 1}`}
              />
            ))}
          </div>

          {/* Next / Start Button */}
          <button
            type="button"
            onClick={(e) => handleNext(e)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
          >
            {isLast ? (
              <>
                <Sparkles className="w-4 h-4 fill-slate-950" />
                <span>Započni pustolovinu</span>
              </>
            ) : (
              <>
                <span>Dalje</span>
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
