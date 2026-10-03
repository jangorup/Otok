import React, { useState, useEffect } from 'react';
import { Smartphone, RefreshCw } from 'lucide-react';

interface OrientationLockProps {
  onForceAllow?: () => void;
}

export const OrientationLock: React.FC<OrientationLockProps> = () => {
  const [isPortrait, setIsPortrait] = useState<boolean>(false);
  const [override, setOverride] = useState<boolean>(false);

  useEffect(() => {
    const checkOrientation = () => {
      // In mobile or small viewports, height > width signifies portrait
      const portrait = window.innerHeight > window.innerWidth;
      setIsPortrait(portrait);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortrait || override) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/95 text-white p-6 text-center backdrop-blur-md select-none">
      <div className="relative mb-6 flex items-center justify-center">
        {/* Animated Phone Icon */}
        <div className="relative w-24 h-24 flex items-center justify-center rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl">
          <Smartphone className="w-14 h-14 text-amber-400 animate-phone-rotate" />
          <RefreshCw className="absolute -bottom-2 -right-2 w-7 h-7 text-sky-400 animate-spin" style={{ animationDuration: '6s' }} />
        </div>
      </div>

      <h2 className="text-2xl font-bold font-heading tracking-wide text-amber-100 mb-2">
        Okreni mobitel vodoravno
      </h2>

      <p className="text-sm text-slate-300 max-w-xs mb-8 leading-relaxed">
        Mirni Otok je dizajniran za igranje u vodoravnom položaju (landscape) kako bi uživao u punom pogledu na otok.
      </p>

      {/* Manual bypass for testing or desktop window sizing */}
      <button
        type="button"
        onClick={() => setOverride(true)}
        className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg border border-slate-800 hover:bg-slate-800/60 transition-colors"
      >
        Igraj svejedno u uspravnom načinu
      </button>
    </div>
  );
};
