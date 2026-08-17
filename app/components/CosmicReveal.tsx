"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { motion } from "framer-motion";
import type { BirthData } from "../page";
import {
  toJulianDate,
  localToUTC,
  starToScreen,
  type GeoLocation,
} from "../lib/astronomy";
import starsData from "../data/stars.json";

/* ============================================
   COSMIC REVEAL — Hyperspace zoom orchestrator
   Three-phase cinematic sequence:
     1. Darkness + cosmic pulse  (0 – 1.5s)
     2. Star streaks zoom-in     (1.5 – 4.5s)
     3. Stars settle at real pos (4.5 – 6.5s)
   Then calls onComplete() → explore phase.
   ============================================ */

const PHASE_TIMINGS = {
  darkness: 1500,      // ms of void + pulse
  hyperspace: 3000,    // ms of streak zoom
  settle: 2000,        // ms of stars resolving
};

const TOTAL_DURATION =
  PHASE_TIMINGS.darkness + PHASE_TIMINGS.hyperspace + PHASE_TIMINGS.settle;

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

// Streak star for the hyperspace phase
interface StreakStar {
  // Angle from center (radians)
  angle: number;
  // How far from center it starts (0..1 normalized)
  rStart: number;
  // Speed multiplier
  speed: number;
  // Brightness
  brightness: number;
  // Width of streak
  width: number;
}

function generateStreaks(count: number): StreakStar[] {
  const streaks: StreakStar[] = [];
  for (let i = 0; i < count; i++) {
    const seed = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    const rand = () => {
      const v = Math.sin(seed + streaks.length * 78.233) * 43758.5453;
      return v - Math.floor(v);
    };
    streaks.push({
      angle: rand() * Math.PI * 2,
      rStart: 0.02 + rand() * 0.15,
      speed: 0.3 + rand() * 0.7,
      brightness: 0.4 + rand() * 0.6,
      width: 0.5 + rand() * 1.5,
    });
  }
  return streaks;
}

const STREAKS = generateStreaks(200);

interface CosmicRevealProps {
  birthData: BirthData;
  onComplete: () => void;
}

export default function CosmicReveal({ birthData, onComplete }: CosmicRevealProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const startTimeRef = useRef(0);
  const [revealPhase, setRevealPhase] = useState<"darkness" | "hyperspace" | "settle" | "done">("darkness");
  const completedRef = useRef(false);

  // Precompute the final star positions for the settle phase
  const finalStarsRef = useRef<{ x: number; y: number; r: number; color: string; opacity: number }[]>([]);

  const computeFinalStars = useCallback((w: number, h: number) => {
    const utc = localToUTC(birthData.local, birthData.utcOffset);
    const jd = toJulianDate(utc);
    const loc: GeoLocation = birthData.location;

    const result: typeof finalStarsRef.current = [];
    for (const star of starsData) {
      if (star.mag > 5.2) continue; // optimize reveal transition to brightest ~1200 stars
      const projected = starToScreen(
        { ra: star.ra, dec: star.dec },
        loc, jd, w, h, 180, 180
      );
      if (projected.visible) {
        const mag = star.mag;
        const r = Math.max(1, 4 - mag * 0.8);
        const opacity = Math.max(0.3, Math.min(1, 1.05 - (mag + 1.5) * 0.12));
        result.push({
          x: projected.x,
          y: projected.y,
          r,
          color: star.color || "#cad7ff",
          opacity,
        });
      }
    }
    finalStarsRef.current = result;
  }, [birthData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let w = 0, h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      computeFinalStars(w, h);
    }

    resize();
    window.addEventListener("resize", resize);
    startTimeRef.current = performance.now();

    function hexToRgba(hex: string, alpha: number): string {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }

    function draw(now: number) {
      const elapsed = now - startTimeRef.current;
      const cx = w / 2;
      const cy = h / 2;

      // Background — always dark void
      ctx!.fillStyle = "#050510";
      ctx!.fillRect(0, 0, w, h);

      // ── PHASE 1: Darkness + cosmic pulse ──
      if (elapsed < PHASE_TIMINGS.darkness) {
        const t = elapsed / PHASE_TIMINGS.darkness;

        // Subtle radial glow pulse
        const pulseIntensity = Math.sin(t * Math.PI * 3) * 0.04 + 0.02;
        const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.5);
        grad.addColorStop(0, `rgba(136, 136, 204, ${pulseIntensity})`);
        grad.addColorStop(1, "transparent");
        ctx!.fillStyle = grad;
        ctx!.fillRect(0, 0, w, h);

        // A few tiny pinprick stars fading in
        const starAlpha = t * 0.3;
        for (let i = 0; i < 30; i++) {
          const sx = (Math.sin(i * 127.1) * 0.5 + 0.5) * w;
          const sy = (Math.sin(i * 311.7) * 0.5 + 0.5) * h;
          ctx!.beginPath();
          ctx!.arc(sx, sy, 0.8, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(200,210,255,${starAlpha})`;
          ctx!.fill();
        }

        setRevealPhase("darkness");
      }

      // ── PHASE 2: Hyperspace zoom streaks ──
      else if (elapsed < PHASE_TIMINGS.darkness + PHASE_TIMINGS.hyperspace) {
        const localT = (elapsed - PHASE_TIMINGS.darkness) / PHASE_TIMINGS.hyperspace;

        // Acceleration curve — starts slow, ramps up
        const accel = localT * localT * localT;

        for (const streak of STREAKS) {
          const progress = streak.rStart + accel * streak.speed * 2;
          const streakLen = 0.02 + accel * 0.35 * streak.speed;

          // Start and end of the streak (radial from center)
          const r1 = Math.max(0, progress - streakLen);
          const r2 = progress;

          const maxR = Math.max(w, h) * 0.8;
          const x1 = cx + Math.cos(streak.angle) * r1 * maxR;
          const y1 = cy + Math.sin(streak.angle) * r1 * maxR;
          const x2 = cx + Math.cos(streak.angle) * r2 * maxR;
          const y2 = cy + Math.sin(streak.angle) * r2 * maxR;

          // Fade: brighter as they move out, dim at very end
          const fadein = Math.min(1, localT * 3);
          const fadeout = r2 > 1.2 ? Math.max(0, 1 - (r2 - 1.2) * 3) : 1;
          const alpha = streak.brightness * fadein * fadeout;

          if (alpha < 0.01) continue;

          const grad = ctx!.createLinearGradient(x1, y1, x2, y2);
          grad.addColorStop(0, `rgba(180,200,255,0)`);
          grad.addColorStop(0.5, `rgba(200,215,255,${alpha * 0.5})`);
          grad.addColorStop(1, `rgba(255,255,255,${alpha})`);

          ctx!.beginPath();
          ctx!.moveTo(x1, y1);
          ctx!.lineTo(x2, y2);
          ctx!.strokeStyle = grad;
          ctx!.lineWidth = streak.width * (1 + accel * 2);
          ctx!.lineCap = "round";
          ctx!.stroke();
        }

        // Central glow intensifies
        const glowAlpha = 0.03 + accel * 0.08;
        const grad = ctx!.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.3);
        grad.addColorStop(0, `rgba(200,210,255,${glowAlpha})`);
        grad.addColorStop(1, "transparent");
        ctx!.fillStyle = grad;
        ctx!.fillRect(0, 0, w, h);

        setRevealPhase("hyperspace");
      }

      // ── PHASE 3: Stars settle into real positions ──
      else if (elapsed < TOTAL_DURATION) {
        const localT = (elapsed - PHASE_TIMINGS.darkness - PHASE_TIMINGS.hyperspace) / PHASE_TIMINGS.settle;

        // Ease out expo for settling
        const ease = 1 - Math.pow(1 - localT, 3);

        // Sky gradient fades in
        const gradBg = ctx!.createLinearGradient(0, 0, 0, h);
        gradBg.addColorStop(0, "#0a0a1a");
        gradBg.addColorStop(0.5, "#0d0d24");
        gradBg.addColorStop(1, "#141428");
        ctx!.globalAlpha = ease;
        ctx!.fillStyle = gradBg;
        ctx!.fillRect(0, 0, w, h);
        ctx!.globalAlpha = 1;

        // Stars fly from center to their final positions
        for (const star of finalStarsRef.current) {
          // Start from center, lerp to final position
          const x = cx + (star.x - cx) * ease;
          const y = cy + (star.y - cy) * ease;

          // Stars also fade in
          const alpha = star.opacity * ease;

          // Slight size overshoot then settle
          const sizeMultiplier = 1 + (1 - ease) * 2;
          const r = star.r * sizeMultiplier;

          // Glow for bright stars
          if (r > 1.5) {
            ctx!.beginPath();
            ctx!.arc(x, y, r * 2.5, 0, Math.PI * 2);
            ctx!.fillStyle = hexToRgba(star.color, alpha * 0.1);
            ctx!.fill();
          }

          ctx!.beginPath();
          ctx!.arc(x, y, r, 0, Math.PI * 2);
          ctx!.fillStyle = hexToRgba(star.color, alpha);
          ctx!.fill();
        }

        setRevealPhase("settle");
      }

      // ── Done ──
      else {
        // Draw final state
        const gradBg = ctx!.createLinearGradient(0, 0, 0, h);
        gradBg.addColorStop(0, "#0a0a1a");
        gradBg.addColorStop(0.5, "#0d0d24");
        gradBg.addColorStop(1, "#141428");
        ctx!.fillStyle = gradBg;
        ctx!.fillRect(0, 0, w, h);

        for (const star of finalStarsRef.current) {
          if (star.r > 1.5) {
            ctx!.beginPath();
            ctx!.arc(star.x, star.y, star.r * 2.5, 0, Math.PI * 2);
            ctx!.fillStyle = hexToRgba(star.color, star.opacity * 0.1);
            ctx!.fill();
          }
          ctx!.beginPath();
          ctx!.arc(star.x, star.y, star.r, 0, Math.PI * 2);
          ctx!.fillStyle = hexToRgba(star.color, star.opacity);
          ctx!.fill();
        }

        if (!completedRef.current) {
          completedRef.current = true;
          setRevealPhase("done");
          // Small delay so the final frame paints before transition
          setTimeout(() => onComplete(), 200);
        }
        return; // Stop RAF
      }
    }

    function loop() {
      draw(performance.now());
      if (!completedRef.current) {
        rafRef.current = requestAnimationFrame(loop);
      }
    }

    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [computeFinalStars, onComplete]);

  return (
    <motion.div
      className="cosmic-reveal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, ease: EASE_OUT_EXPO }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          display: "block",
          zIndex: "var(--z-overlay)" as string,
        }}
      />

      {/* Phase label + skip button */}
      <div className="cosmic-reveal-ui">
        <p className="cosmic-reveal-status">
          {revealPhase === "darkness" && "Reaching into the past…"}
          {revealPhase === "hyperspace" && "Travelling to your birth sky…"}
          {revealPhase === "settle" && "The stars are aligning…"}
          {revealPhase === "done" && ""}
        </p>
        {revealPhase !== "done" && (
          <button
            className="cosmic-reveal-skip"
            onClick={() => {
              completedRef.current = true;
              cancelAnimationFrame(rafRef.current);
              onComplete();
            }}
          >
            Skip →
          </button>
        )}
      </div>
    </motion.div>
  );
}
