"use client";

import type { MoonInfo } from "../lib/moonPhase";
import { litSide } from "../lib/moonPhase";

interface MoonRendererProps {
  moon: MoonInfo;
  observerLat: number;
}

/** A small, accessible phase portrait for the birth-sky information panel. */
export default function MoonRenderer({ moon, observerLat }: MoonRendererProps) {
  const illumination = Math.round(moon.illumination * 100);
  const side = litSide(moon.waxing, observerLat);
  const shadowShift = moon.illumination * 62;

  return (
    <div className="moon-renderer" aria-label={`${moon.phaseName}, ${illumination}% illuminated`}>
      <svg className="moon-renderer-orb" viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <radialGradient id="moon-light" cx="35%" cy="30%">
            <stop offset="0" stopColor="#fffdf3" />
            <stop offset="1" stopColor="#ddd8c6" />
          </radialGradient>
          <filter id="moon-glow" x="-80%" y="-80%" width="260%" height="260%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        <circle cx="50" cy="50" r="35" fill="rgba(232,229,205,0.18)" filter="url(#moon-glow)" />
        <circle cx="50" cy="50" r="28" fill="url(#moon-light)" />
        {illumination < 99 && (
          <circle
            cx={side === "right" ? 50 - shadowShift : 50 + shadowShift}
            cy="50"
            r="30"
            fill="#111124"
          />
        )}
        <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(255,255,255,0.25)" />
      </svg>
      <div>
        <p className="sky-card-kicker">Birth Moon</p>
        <p className="moon-renderer-name">{moon.phaseName}</p>
        <p className="moon-renderer-meta">{illumination}% lit · {moon.age.toFixed(1)} days old</p>
      </div>
    </div>
  );
}
