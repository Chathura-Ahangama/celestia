"use client";

import { useState, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import type { UTCDateTime, GeoLocation } from "./lib/astronomy";
import StarField from "./components/StarField";
import ShootingStar from "./components/ShootingStar";
import LandingHero from "./components/LandingHero";
import BirthForm from "./components/BirthForm";
import CosmicReveal from "./components/CosmicReveal";
import NightSkyCanvas from "./components/NightSkyCanvas";

/* ============================================
   APP PHASES
   landing   → title + starfield + CTA button
   form      → the celestial instrument (birth input)
   revealing → cinematic hyperspace reveal
   explore   → interactive sky + card + panels
   ============================================ */
export type AppPhase = "landing" | "form" | "revealing" | "explore";

/* ---------- BIRTH DATA SHAPE ---------- */
export interface BirthData {
  /** Local calendar date/time as the user entered it. */
  local: UTCDateTime;
  /** Observer location. */
  location: GeoLocation;
  /** City label for display. */
  cityName: string;
  /** UTC offset in hours used to convert local → UTC. */
  utcOffset: number;
}

export default function Home() {
  const [phase, setPhase] = useState<AppPhase>("landing");
  const [birthData, setBirthData] = useState<BirthData | null>(null);

  /* Advance from landing → form (button click, Enter, or scroll) */
  const goToForm = useCallback(() => {
    setPhase("form");
  }, []);

  /* Form submitted → begin the reveal */
  const handleReveal = useCallback((data: BirthData) => {
    setBirthData(data);
    setPhase("revealing");
  }, []);

  /* Reveal animation finished → interactive explore */
  const handleRevealComplete = useCallback(() => {
    setPhase("explore");
  }, []);

  /* Start over */
  const reset = useCallback(() => {
    setBirthData(null);
    setPhase("landing");
  }, []);

  return (
    <main>
      {/* ===== SKY LAYER (fixed, fullscreen, behind everything) ===== */}
      <div className="sky-layer">
        <StarField />
        <ShootingStar />
      </div>

      {/* ===== CONTENT LAYER (UI floats above sky with AnimatePresence transitions) ===== */}
      <div className="content-layer">
        <AnimatePresence mode="wait">
          {phase === "landing" && (
            <LandingHero key="landing" onContinue={goToForm} />
          )}

          {phase === "form" && (
            <BirthForm key="form" onReveal={handleReveal} />
          )}
        </AnimatePresence>

        {/* Cinematic reveal sequence */}
        {phase === "revealing" && birthData && (
          <CosmicReveal
            key="revealing"
            birthData={birthData}
            onComplete={handleRevealComplete}
          />
        )}

        {/* Interactive sky */}
        {phase === "explore" && birthData && (
          <NightSkyCanvas key="explore" birthData={birthData} onReset={reset} />
        )}
      </div>
    </main>
  );
}
