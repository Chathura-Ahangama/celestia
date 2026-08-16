"use client";

import { useState, useCallback } from "react";
import type { UTCDateTime, GeoLocation } from "./lib/astronomy";
import StarField from "./components/StarField";
import ShootingStar from "./components/ShootingStar";
import LandingHero from "./components/LandingHero";
import BirthForm from "./components/BirthForm";

/* ============================================
   APP PHASES
   landing   → title + starfield + scroll hint
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

  /* Advance from landing → form (scroll or click) */
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

      {/* ===== CONTENT LAYER (UI floats above sky) ===== */}
      <div className="content-layer">
        {phase === "landing" && <LandingHero onContinue={goToForm} />}

        {phase === "form" && <BirthForm onReveal={handleReveal} />}

        {(phase === "revealing" || phase === "explore") && birthData && (
          <RevealPlaceholder
            birthData={birthData}
            phase={phase}
            onComplete={handleRevealComplete}
            onReset={reset}
          />
        )}
      </div>
    </main>
  );
}

/* ============================================
   TEMPORARY PLACEHOLDERS
   These get replaced with real components in later steps.
   They exist so the app compiles & you can test the flow NOW.
   ============================================ */

function RevealPlaceholder({
  birthData,
  phase,
  onComplete,
  onReset,
}: {
  birthData: BirthData;
  phase: AppPhase;
  onComplete: () => void;
  onReset: () => void;
}) {
  return (
    <section className="viewport-center">
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "1.8rem",
          letterSpacing: "0.15em",
          marginBottom: "var(--space-3)",
        }}
      >
        {phase === "revealing" ? "Revealing…" : "Your Sky"}
      </h2>

      <p className="mono" style={{ marginBottom: "var(--space-2)" }}>
        {birthData.cityName}
      </p>
      <p className="mono" style={{ marginBottom: "var(--space-4)" }}>
        {birthData.local.year}-{String(birthData.local.month).padStart(2, "0")}-
        {String(birthData.local.day).padStart(2, "0")}{" "}
        {String(birthData.local.hour).padStart(2, "0")}:
        {String(birthData.local.minute).padStart(2, "0")} (UTC
        {birthData.utcOffset >= 0 ? "+" : ""}
        {birthData.utcOffset})
      </p>

      {phase === "revealing" && (
        <button
          onClick={onComplete}
          style={{
            background: "transparent",
            border: "1px solid var(--glass-border)",
            color: "var(--celestial)",
            padding: "var(--space-1) var(--space-3)",
            borderRadius: "999px",
            cursor: "pointer",
            marginBottom: "var(--space-2)",
          }}
        >
          Skip → Explore
        </button>
      )}

      <button
        onClick={onReset}
        style={{
          background: "transparent",
          border: "none",
          color: "var(--moonbeam)",
          cursor: "pointer",
          fontSize: "0.85rem",
          letterSpacing: "0.1em",
        }}
      >
        ← Start over
      </button>
    </section>
  );
}
