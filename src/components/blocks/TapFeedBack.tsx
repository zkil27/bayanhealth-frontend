'use client'; 

import { useEffect, useState } from 'react';

interface Tap {
  id: number;
  x: number;
  y: number;
}

export default function TapFeedback() {
  const [taps, setTaps] = useState<Tap[]>([]);

  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {

      const newTap = { id: Date.now(), x: e.clientX, y: e.clientY };
      setTaps((prev) => [...prev, newTap]);

      setTimeout(() => {
        setTaps((prev) => prev.filter((t) => t.id !== newTap.id));
      }, 400);
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none z-9999 overflow-hidden">
      {taps.map((tap) => (
        <div
          key={tap.id}
          className="absolute bg-primary/75 dark:bg-secondary rounded-full animate-cursor-tap-ping"
          style={{
            left: tap.x - 15,
            top: tap.y - 15,
            width: '25px',
            height: '25px',
          }}
        />
      ))}
    </div>
  );
}
