"use client";

import { useMemo } from "react";

interface ConfettiProps {
  color: string;
  count?: number;
}

export default function Confetti({ color, count = 18 }: ConfettiProps) {
  const pieces = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const radius = 60 + Math.random() * 80;
      return {
        cx: Math.cos(angle) * radius,
        cy: Math.sin(angle) * radius,
        cr: 180 + Math.random() * 540,
        delay: Math.random() * 90,
        hue: i % 3 === 0 ? color : i % 3 === 1 ? "#fff" : `${color}cc`,
      };
    });
  }, [color, count]);

  return (
    <div aria-hidden className="absolute inset-0 pointer-events-none overflow-visible">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={
            {
              background: p.hue,
              animationDelay: `${p.delay}ms`,
              "--cx": `${p.cx}px`,
              "--cy": `${p.cy}px`,
              "--cr": `${p.cr}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
