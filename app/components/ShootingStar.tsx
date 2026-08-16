"use client";

import { useEffect, useRef, useCallback } from "react";

/* ============================================
   SHOOTING STAR — Periodic meteor streaks
   Random spawn along top/right edge, streaking
   across with a bright head + fading tail.
   Rendered on a transparent canvas overlay.
   ============================================ */

interface Meteor {
  /** Start position */
  x: number;
  y: number;
  /** Velocity (px/frame at 60fps) */
  vx: number;
  vy: number;
  /** Total lifetime in ms */
  life: number;
  /** Birth timestamp */
  born: number;
  /** Tail length in px */
  tailLen: number;
  /** Brightness 0..1 */
  brightness: number;
}

// How often a new meteor spawns (ms) — randomized around this
const SPAWN_INTERVAL = 6000;
const SPAWN_JITTER = 4000;

export default function ShootingStar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);
  const meteorsRef = useRef<Meteor[]>([]);
  const nextSpawnRef = useRef(performance.now() + 2000); // first one after 2s

  const spawnMeteor = useCallback((now: number, w: number, h: number) => {
    // Spawn from top edge or right edge
    const fromTop = Math.random() > 0.35;
    const x = fromTop
      ? Math.random() * w * 0.8 + w * 0.1
      : w - Math.random() * w * 0.15;
    const y = fromTop
      ? -10
      : Math.random() * h * 0.3;

    // Angle: roughly 20-50° from vertical, sweeping left-down or right-down
    const angleDeg = 20 + Math.random() * 30;
    const angleRad = (angleDeg * Math.PI) / 180;
    const speed = 6 + Math.random() * 6;
    const direction = fromTop ? (Math.random() > 0.5 ? 1 : -1) : -1;

    meteorsRef.current.push({
      x,
      y,
      vx: Math.sin(angleRad) * speed * direction,
      vy: Math.cos(angleRad) * speed,
      life: 600 + Math.random() * 500,
      born: now,
      tailLen: 60 + Math.random() * 80,
      brightness: 0.7 + Math.random() * 0.3,
    });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

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

    let visible = true;
    function handleVis() {
      visible = !document.hidden;
      if (visible) loop();
    }
    document.addEventListener("visibilitychange", handleVis);

    function draw(now: number) {
      ctx!.clearRect(0, 0, w, h);

      // Maybe spawn a new meteor
      if (now >= nextSpawnRef.current) {
        spawnMeteor(now, w, h);
        nextSpawnRef.current =
          now + SPAWN_INTERVAL + (Math.random() - 0.5) * SPAWN_JITTER * 2;
      }

      // Update & draw meteors
      const alive: Meteor[] = [];
      for (const m of meteorsRef.current) {
        const age = now - m.born;
        if (age > m.life) continue;
        alive.push(m);

        const progress = age / m.life; // 0..1
        // Fade in fast, fade out slow
        const opacity =
          progress < 0.1
            ? progress / 0.1
            : 1 - (progress - 0.1) / 0.9;

        // Current head position
        const frames = age / 16.667; // approximate frame count
        const cx = m.x + m.vx * frames;
        const cy = m.y + m.vy * frames;

        // Tail start (behind the head)
        const speed = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
        const dx = (m.vx / speed) * m.tailLen;
        const dy = (m.vy / speed) * m.tailLen;
        const tx = cx - dx;
        const ty = cy - dy;

        // Gradient from bright head to transparent tail
        const grad = ctx!.createLinearGradient(tx, ty, cx, cy);
        grad.addColorStop(0, `rgba(255,255,255,0)`);
        grad.addColorStop(0.6, `rgba(220,230,255,${opacity * m.brightness * 0.3})`);
        grad.addColorStop(1, `rgba(255,255,255,${opacity * m.brightness * 0.9})`);

        ctx!.beginPath();
        ctx!.moveTo(tx, ty);
        ctx!.lineTo(cx, cy);
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = 1.5;
        ctx!.lineCap = "round";
        ctx!.stroke();

        // Bright head dot
        if (opacity > 0.2) {
          ctx!.beginPath();
          ctx!.arc(cx, cy, 1.5, 0, Math.PI * 2);
          ctx!.fillStyle = `rgba(255,255,255,${opacity * m.brightness})`;
          ctx!.fill();
        }
      }
      meteorsRef.current = alive;
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
      document.removeEventListener("visibilitychange", handleVis);
    };
  }, [spawnMeteor]);

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
        pointerEvents: "none",
      }}
    />
  );
}
