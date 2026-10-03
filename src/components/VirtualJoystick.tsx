import React, { useRef, useState, useEffect, useCallback } from 'react';

interface VirtualJoystickProps {
  onMove: (vector: { x: number; y: number }) => void;
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({ onMove }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState<boolean>(false);
  const touchIdRef = useRef<number | null>(null);

  const radius = 56; // max joystick pull radius in px

  const handlePointerDown = useCallback((clientX: number, clientY: number, id: number | null) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    touchIdRef.current = id;
    setIsActive(true);

    const clampedDist = Math.min(dist, radius);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    setKnobPos({ x: kx, y: ky });
    onMove({ x: kx / radius, y: ky / radius });
  }, [onMove, radius]);

  const handlePointerMove = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current || !isActive) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const dist = Math.hypot(dx, dy);

    const clampedDist = Math.min(dist, radius);
    const angle = Math.atan2(dy, dx);
    const kx = Math.cos(angle) * clampedDist;
    const ky = Math.sin(angle) * clampedDist;

    setKnobPos({ x: kx, y: ky });

    // Apply small deadzone (0.15) for crisp control
    const norm = clampedDist / radius;
    if (norm < 0.15) {
      onMove({ x: 0, y: 0 });
    } else {
      onMove({ x: kx / radius, y: ky / radius });
    }
  }, [isActive, onMove, radius]);

  const handlePointerUp = useCallback(() => {
    touchIdRef.current = null;
    setIsActive(false);
    setKnobPos({ x: 0, y: 0 });
    onMove({ x: 0, y: 0 });
  }, [onMove]);

  // Touch event listeners
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    if (touchIdRef.current === null && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      handlePointerDown(touch.clientX, touch.clientY, touch.identifier);
    }
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        handlePointerMove(touch.clientX, touch.clientY);
        break;
      }
    }
  };

  const onTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        handlePointerUp();
        break;
      }
    }
  };

  // Mouse event listeners for desktop testing
  const onMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    handlePointerDown(e.clientX, e.clientY, null);
  };

  useEffect(() => {
    const onMouseMoveDoc = (e: MouseEvent) => {
      if (isActive && touchIdRef.current === null) {
        handlePointerMove(e.clientX, e.clientY);
      }
    };
    const onMouseUpDoc = () => {
      if (isActive && touchIdRef.current === null) {
        handlePointerUp();
      }
    };

    window.addEventListener('mousemove', onMouseMoveDoc);
    window.addEventListener('mouseup', onMouseUpDoc);

    return () => {
      window.removeEventListener('mousemove', onMouseMoveDoc);
      window.removeEventListener('mouseup', onMouseUpDoc);
    };
  }, [isActive, handlePointerMove, handlePointerUp]);

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={onTouchEnd}
      onMouseDown={onMouseDown}
      className="relative w-36 h-36 flex items-center justify-center select-none touch-none cursor-pointer"
      style={{ WebkitUserSelect: 'none' }}
    >
      {/* Outer boundary ring */}
      <div className={`w-32 h-32 rounded-full border-2 transition-colors duration-150 flex items-center justify-center shadow-lg backdrop-blur-xs ${
        isActive
          ? 'bg-slate-900/50 border-amber-400/60 shadow-amber-500/10'
          : 'bg-slate-900/35 border-white/25'
      }`}>
        {/* Cardinal direction hints */}
        <div className="absolute top-2 w-1.5 h-1.5 rounded-full bg-white/30" />
        <div className="absolute bottom-2 w-1.5 h-1.5 rounded-full bg-white/30" />
        <div className="absolute left-2 w-1.5 h-1.5 rounded-full bg-white/30" />
        <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-white/30" />

        {/* Center Thumb Knob */}
        <div
          className={`w-14 h-14 rounded-full shadow-md transition-shadow flex items-center justify-center ${
            isActive
              ? 'bg-gradient-to-b from-amber-400 to-amber-500 shadow-amber-500/40 text-slate-950 scale-105'
              : 'bg-white/70 shadow-black/20 text-slate-700'
          }`}
          style={{
            transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
            willChange: 'transform',
          }}
        >
          <div className="w-5 h-5 rounded-full border border-black/15 bg-white/20" />
        </div>
      </div>
    </div>
  );
};
