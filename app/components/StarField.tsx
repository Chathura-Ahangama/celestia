"use client";

import { useRef, useEffect, useCallback } from "react";

/* ============================================
   STARFIELD — Parallax breathing star background
   Three depth layers of procedural stars with
   mouse-tracked parallax and gentle twinkle.
   ============================================ */

// ---------- CONFIGURATION ----------
const LAYER_CONFIG = [
  { count: 180, sizeMin: 0.4, sizeMax: 1.2, speed: 0.15, opacity: 0.35 }, // far
  { count: 120, sizeMin: 0.8, sizeMax: 2.0, speed: 0.35, opacity: 0.55 }, // mid
  { count: 60, sizeMin: 1.4, sizeMax: 3.0, speed: 0.65, opacity: 0.8 },  // near
] as const;

const PARALLAX_STRENGTH = 20; // px max offset at edges
const TWINKLE_SPEED = 0.0008; // radians per ms

// Star colors — weighted toward blue-white with occasional warm tones
const STAR_COLORS = [
  "#cad7ff", "#cad7ff", "#cad7ff", "#cad7ff", // A-type blue-white (dominant)
  "#aabfff", "#aabfff",                         // B-type blue
  "#f8f7ff", "#f8f7ff", "#f8f7ff",              // F-type white
  "#fff4ea", "#fff4ea",                          // G-type warm white
  "#ffd2a1",                                     // K-type orange
  "#ffb56c",                                     // M-type deep orange
];

interface Star {
  /** Normalized position 0..1 (stable across resizes) */
  nx: number;
  ny: number;
  radius: number;
  baseOpacity: number;
  /** Per-star twinkle phase offset so they don't all pulse together */
  twinkleOffset: number;
  /** Twinkle amplitude — how much the opacity oscillates */
  twinkleAmp: number;
  color: string;
  /** Parallax multiplier from the layer */
  parallax: number;
}

/** Seed a deterministic-ish random from an index (no crypto needed) */
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateStars(): Star[] {
  const stars: Star[] = [];
  let globalIndex = 0;

  for (const layer of LAYER_CONFIG) {
    const rand = seededRandom(42 + globalIndex * 7);
    for (let i = 0; i < layer.count; i++) {
      stars.push({
        nx: rand(),
        ny: rand(),
        radius:
          layer.sizeMin + rand() * (layer.sizeMax - layer.sizeMin),
        baseOpacity:
          layer.opacity * (0.6 + rand() * 0.4),
        twinkleOffset: rand() * Math.PI * 2,
        twinkleAmp: 0.15 + rand() * 0.3,
        color: STAR_COLORS[Math.floor(rand() * STAR_COLORS.length)],
        parallax: layer.speed,
      });
      globalIndex++;
    }
  }

  return stars;
}

// Pre-generate once (module-level, shared across renders)
const ALL_STARS = generateStars();

export default function StarField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  // Mouse position normalized to [-1, 1] from center
  const mouseRef = useRef({ x: 0, y: 0 });
  // Smoothed mouse for lerp
  const smoothMouseRef = useRef({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current = {
      x: (e.clientX / window.innerWidth) * 2 - 1,
      y: (e.clientY / window.innerHeight) * 2 - 1,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Resize handler
    let w = 0;
    let h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", handleMouseMove);

    // Visibility: pause RAF when hidden
    let visible = true;
    function handleVisibility() {
      visible = !document.hidden;
      if (visible) {
        startTime = performance.now();
        loop();
      }
    }
    document.addEventListener("visibilitychange", handleVisibility);

    let startTime = performance.now();

    function draw(now: number) {
      const elapsed = now - startTime;

      // Lerp smoothed mouse toward actual mouse (buttery feel)
      const sm = smoothMouseRef.current;
      const tm = mouseRef.current;
      sm.x += (tm.x - sm.x) * 0.04;
      sm.y += (tm.y - sm.y) * 0.04;

      // Sky gradient background
      const grad = ctx!.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, "#0a0a1a");   // --sky-zenith
      grad.addColorStop(0.5, "#0d0d24"); // --sky-mid
      grad.addColorStop(1, "#141428");   // --sky-horizon
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, w, h);

      // Draw stars
      for (const star of ALL_STARS) {
        // Parallax offset
        const px = sm.x * PARALLAX_STRENGTH * star.parallax;
        const py = sm.y * PARALLAX_STRENGTH * star.parallax;

        const x = star.nx * w + px;
        const y = star.ny * h + py;

        // Twinkle
        const twinkle =
          Math.sin(elapsed * TWINKLE_SPEED + star.twinkleOffset) *
          star.twinkleAmp;
        const opacity = Math.max(
          0.1,
          Math.min(1, star.baseOpacity + twinkle)
        );

        // Glow for larger stars
        if (star.radius > 1.8) {
          ctx!.beginPath();
          ctx!.arc(x, y, star.radius * 2.5, 0, Math.PI * 2);
          ctx!.fillStyle = star.color.replace(
            ")",
            ""
          );
          // Parse hex → rgba for glow
          const glowAlpha = opacity * 0.12;
          ctx!.fillStyle = hexToRgba(star.color, glowAlpha);
          ctx!.fill();
        }

        // Core dot
        ctx!.beginPath();
        ctx!.arc(x, y, star.radius, 0, Math.PI * 2);
        ctx!.fillStyle = hexToRgba(star.color, opacity);
        ctx!.fill();
      }
    }

    function loop() {
      if (!visible) return;
      draw(performance.now());
      rafRef.current = requestAnimationFrame(loop);
    }

    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [handleMouseMove]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
      }}
    />
  );
}

// ---------- UTIL ----------
/** Convert a hex color (#rrggbb) to rgba string with given alpha. */
function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
