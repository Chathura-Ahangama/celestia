"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import type { BirthData } from "../page";
import {
  toJulianDate,
  localToUTC,
  starToScreen,
  projectToScreen,
  equatorialToHorizontal,
  sunEquatorial,
  normalizeDeg,
  type GeoLocation,
} from "../lib/astronomy";
import {
  magnitudeToRadius,
  magnitudeToOpacity,
  skyGradientForSunAltitude,
} from "../lib/coordinates";
import { getMoonInfo } from "../lib/moonPhase";
import { getAllPlanets } from "../lib/planets";
import starsData from "../data/stars.json";
import constellationsData from "../data/constellations.json";
import SkyInfoPanel from "./SkyInfoPanel";

/* ============================================
   NIGHT SKY CANVAS — Interactive birth sky
   ============================================ */

interface CatalogStar {
  name: string;
  bayer: string;
  ra: number;
  dec: number;
  mag: number;
  constellation: string;
  color: string;
}

interface ConstellationDef {
  name: string;
  abbr: string;
  lines: number[][];
}

const stars = starsData as CatalogStar[];
const constellations = constellationsData as ConstellationDef[];

interface RenderedStar {
  x: number;
  y: number;
  r: number;
  opacity: number;
  color: string;
  visible: boolean;
  name: string;
  mag: number;
  // precomputed twinkle phase so we don't derive from x/y each frame
  twPhase: number;
}

// ── Cached hex→rgb parsing (avoids re-parsing every frame) ──
const rgbCache = new Map<string, [number, number, number]>();
function parseHex(hex: string): [number, number, number] {
  let cached = rgbCache.get(hex);
  if (cached) return cached;
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  cached = [r, g, b];
  rgbCache.set(hex, cached);
  return cached;
}
function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface NightSkyCanvasProps {
  birthData: BirthData;
  onReset: () => void;
}

export default function NightSkyCanvas({
  birthData,
  onReset,
}: NightSkyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  const [centerAz, setCenterAz] = useState(180);
  const [fovDeg, setFovDeg] = useState(180);
  const [isDraggingState, setIsDraggingState] = useState(false);
  const [showConstellations, setShowConstellations] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const showConstellationsRef = useRef(showConstellations);
  const showLabelsRef = useRef(showLabels);

  // Refs for animation loop (avoid stale closures)
  const centerAzRef = useRef(centerAz);
  const fovDegRef = useRef(fovDeg);
  // "dirty" flag: only recompute projections when camera moved
  const dirtyRef = useRef(true);
  // pan velocity for inertia
  const velRef = useRef(0);

  useEffect(() => {
    centerAzRef.current = centerAz;
    dirtyRef.current = true;
  }, [centerAz]);

  useEffect(() => {
    fovDegRef.current = fovDeg;
    dirtyRef.current = true;
  }, [fovDeg]);

  useEffect(() => {
    showConstellationsRef.current = showConstellations;
  }, [showConstellations]);

  useEffect(() => {
    showLabelsRef.current = showLabels;
  }, [showLabels]);

  // Drag state
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartAz = useRef(0);
  const lastMoveX = useRef(0);
  const lastMoveT = useRef(0);
  // pinch state
  const pinchDist = useRef(0);
  const pinchFov = useRef(0);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());

  const birthJd = useRef(0);
  const birthLoc = useRef<GeoLocation>({ lat: 0, lon: 0 });
  const sunAlt = useRef(0);

  useEffect(() => {
    const utc = localToUTC(birthData.local, birthData.utcOffset);
    birthJd.current = toJulianDate(utc);
    birthLoc.current = birthData.location;
    const sunEq = sunEquatorial(birthJd.current);
    const sunHoriz = equatorialToHorizontal(
      sunEq,
      birthLoc.current,
      birthJd.current,
    );
    sunAlt.current = sunHoriz.alt;
    dirtyRef.current = true;
  }, [birthData]);

  // ── Pointer handlers (support pinch) ──
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      // start pinch
      const pts = [...pointers.current.values()];
      pinchDist.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchFov.current = fovDegRef.current;
      isDragging.current = false;
      setIsDraggingState(false);
      return;
    }

    isDragging.current = true;
    setIsDraggingState(true);
    dragStartX.current = e.clientX;
    dragStartAz.current = centerAzRef.current;
    lastMoveX.current = e.clientX;
    lastMoveT.current = performance.now();
    velRef.current = 0; // stop inertia while grabbing
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // ── Pinch zoom ──
    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchDist.current > 0) {
        const ratio = pinchDist.current / dist;
        setFovDeg(Math.max(30, Math.min(180, pinchFov.current * ratio)));
      }
      return;
    }

    if (!isDragging.current) return;
    const dx = e.clientX - dragStartX.current;
    const degreesPerPx = 0.3 * (fovDegRef.current / 180);
    const newAz = normalizeDeg(dragStartAz.current - dx * degreesPerPx);
    setCenterAz(newAz);

    // track velocity for inertia
    const now = performance.now();
    const dt = now - lastMoveT.current;
    if (dt > 0) {
      const moveDx = e.clientX - lastMoveX.current;
      velRef.current = -moveDx * degreesPerPx * (16 / dt); // deg per frame
    }
    lastMoveX.current = e.clientX;
    lastMoveT.current = now;
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchDist.current = 0;
    if (pointers.current.size === 0) {
      isDragging.current = false;
      setIsDraggingState(false);
    }
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setFovDeg((prev) => {
      // proportional zoom feels smoother than fixed steps
      const factor = e.deltaY > 0 ? 1.08 : 0.92;
      return Math.max(30, Math.min(180, prev * factor));
    });
  }, []);

  // Precompute static-ish scene data once per birthData
  const scene = useMemo(() => {
    const utc = localToUTC(birthData.local, birthData.utcOffset);
    const jd = toJulianDate(utc);
    return {
      planets: getAllPlanets(jd),
      moonInfo: getMoonInfo(jd),
    };
  }, [birthData]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let w = 0,
      h = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    function resize() {
      w = window.innerWidth;
      h = window.innerHeight;
      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      dirtyRef.current = true;
    }
    resize();
    window.addEventListener("resize", resize);

    const jd = birthJd.current;
    const loc = birthLoc.current;
    const planets = scene.planets;
    const moonInfo = scene.moonInfo;
    const moonEq = moonInfo.equatorial;

    // Reusable buffer for projected stars — recomputed only when dirty
    const rendered: RenderedStar[] = new Array(stars.length);
    for (let i = 0; i < stars.length; i++) {
      rendered[i] = {
        x: 0,
        y: 0,
        r: magnitudeToRadius(stars[i].mag),
        opacity: magnitudeToOpacity(stars[i].mag),
        color: stars[i].color || "#cad7ff",
        visible: false,
        name: stars[i].name,
        mag: stars[i].mag,
        twPhase:
          (stars[i].ra * 12.9898 + stars[i].dec * 78.233) % (Math.PI * 2),
      };
    }

    // cache sky gradient (only depends on sunAlt which is fixed)
    const skyColors = skyGradientForSunAltitude(sunAlt.current);

    function projectAll(az: number, fov: number) {
      for (let i = 0; i < stars.length; i++) {
        const p = starToScreen(
          { ra: stars[i].ra, dec: stars[i].dec },
          loc,
          jd,
          w,
          h,
          az,
          fov,
        );
        const s = rendered[i];
        s.x = p.x;
        s.y = p.y;
        s.visible = p.visible;
      }
    }

    function draw(now: number) {
      // ── Apply inertia when not actively dragging ──
      if (!isDragging.current && Math.abs(velRef.current) > 0.01) {
        const newAz = normalizeDeg(centerAzRef.current + velRef.current);
        centerAzRef.current = newAz;
        setCenterAz(newAz); // keeps React state in sync for HUD
        velRef.current *= 0.92; // friction
        dirtyRef.current = true;
      } else if (Math.abs(velRef.current) <= 0.01) {
        velRef.current = 0;
      }

      const az = centerAzRef.current;
      const fov = fovDegRef.current;

      // Reproject stars only when the camera actually changed
      if (dirtyRef.current) {
        projectAll(az, fov);
        dirtyRef.current = false;
      }

      // ── Sky gradient background ──
      const grad = ctx!.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, skyColors.zenith);
      grad.addColorStop(0.5, skyColors.mid);
      grad.addColorStop(1, skyColors.horizon);
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, w, h);

      // ── Horizon line ──
      ctx!.beginPath();
      let started = false;
      for (let hAz = 0; hAz <= 360; hAz += 2) {
        const p = projectToScreen({ alt: 0, az: hAz }, w, h, az, fov);
        if (!started) {
          ctx!.moveTo(p.x, p.y);
          started = true;
        } else {
          ctx!.lineTo(p.x, p.y);
        }
      }
      ctx!.strokeStyle = "rgba(136, 136, 204, 0.10)";
      ctx!.lineWidth = 1;
      ctx!.stroke();

      // ── Constellation lines (batched into one path) ──
      if (showConstellationsRef.current) {
        ctx!.strokeStyle = "rgba(136, 136, 204, 0.12)";
        ctx!.lineWidth = 0.7;
        ctx!.beginPath();
        for (const constellation of constellations) {
          for (const [i1, i2] of constellation.lines) {
            if (i1 >= rendered.length || i2 >= rendered.length) continue;
            const s1 = rendered[i1];
            const s2 = rendered[i2];
            if (!s1.visible && !s2.visible) continue;
            const dx = Math.abs(s1.x - s2.x);
            const dy = Math.abs(s1.y - s2.y);
            if (dx > w * 0.4 || dy > h * 0.4) continue;
            ctx!.moveTo(s1.x, s1.y);
            ctx!.lineTo(s2.x, s2.y);
          }
        }
        ctx!.stroke();
      }

      // ── Stars ──
      const twinkleTime = now * 0.0015;
      for (const star of rendered) {
        if (!star.visible) continue;
        // twinkle uses precomputed phase (no x/y math each frame)
        const twinkle = Math.sin(twinkleTime + star.twPhase) * 0.15;
        const alpha = Math.max(0.1, Math.min(1, star.opacity + twinkle));

        if (star.r > 1.5) {
          ctx!.beginPath();
          ctx!.arc(star.x, star.y, star.r * 3, 0, Math.PI * 2);
          ctx!.fillStyle = hexToRgba(star.color, alpha * 0.08);
          ctx!.fill();
        }

        ctx!.beginPath();
        ctx!.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx!.fillStyle = hexToRgba(star.color, alpha);
        ctx!.fill();
      }

      if (showLabelsRef.current) {
        // ── Bright-star labels ──
        ctx!.font = "10px var(--font-mono, monospace)";
        ctx!.textAlign = "left";
        ctx!.textBaseline = "middle";
        ctx!.fillStyle = "rgba(200, 210, 255, 0.35)";
        for (const star of rendered) {
          if (!star.visible || star.mag > 1.5 || !star.name) continue;
          ctx!.fillText(star.name, star.x + star.r + 4, star.y);
        }

        // ── Constellation labels ──
        ctx!.font = "11px var(--font-body, sans-serif)";
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillStyle = "rgba(136, 136, 204, 0.18)";
        for (const constellation of constellations) {
          let cx = 0,
            cy = 0,
            count = 0;
          for (const [i1] of constellation.lines) {
            if (i1 >= rendered.length) continue;
            const s = rendered[i1];
            if (s.visible) {
              cx += s.x;
              cy += s.y;
              count++;
            }
          }
          if (count < 2) continue;
          cx /= count;
          cy /= count;
          ctx!.fillText(constellation.name, cx, cy - 14);
        }
      }

      // ── Planets ──
      for (const planet of planets) {
        const horiz = equatorialToHorizontal(planet.equatorial, loc, jd);
        const p = projectToScreen(horiz, w, h, az, fov);
        if (!p.visible) continue;

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 8, 0, Math.PI * 2);
        ctx!.fillStyle = hexToRgba(planet.color, 0.08);
        ctx!.fill();

        ctx!.beginPath();
        ctx!.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx!.fillStyle = planet.color;
        ctx!.fill();

        ctx!.font = "10px var(--font-mono, monospace)";
        ctx!.textAlign = "left";
        ctx!.textBaseline = "middle";
        ctx!.fillStyle = hexToRgba(planet.color, 0.7);
        ctx!.fillText(planet.name, p.x + 7, p.y);
      }

      // ── Moon ──
      const moonHoriz = equatorialToHorizontal(moonEq, loc, jd);
      const moonP = projectToScreen(moonHoriz, w, h, az, fov);
      if (moonP.visible) {
        const moonRadius = 10 * (180 / fov);

        const glowGrad = ctx!.createRadialGradient(
          moonP.x,
          moonP.y,
          moonRadius * 0.5,
          moonP.x,
          moonP.y,
          moonRadius * 4,
        );
        glowGrad.addColorStop(0, "rgba(220, 220, 200, 0.06)");
        glowGrad.addColorStop(1, "transparent");
        ctx!.fillStyle = glowGrad;
        ctx!.fillRect(
          moonP.x - moonRadius * 4,
          moonP.y - moonRadius * 4,
          moonRadius * 8,
          moonRadius * 8,
        );

        ctx!.beginPath();
        ctx!.arc(moonP.x, moonP.y, moonRadius, 0, Math.PI * 2);
        ctx!.fillStyle = "rgba(230, 225, 210, 0.9)";
        ctx!.fill();

        const illum = moonInfo.illumination;
        if (illum < 0.98) {
          ctx!.save();
          ctx!.beginPath();
          ctx!.arc(moonP.x, moonP.y, moonRadius, 0, Math.PI * 2);
          ctx!.clip();
          const shadowOffset = moonRadius * 2 * (1 - illum);
          const shadowX = moonInfo.waxing
            ? moonP.x - shadowOffset
            : moonP.x + shadowOffset;
          ctx!.beginPath();
          ctx!.arc(shadowX, moonP.y, moonRadius * 1.1, 0, Math.PI * 2);
          ctx!.fillStyle = "rgba(5, 5, 16, 0.85)";
          ctx!.fill();
          ctx!.restore();
        }

        ctx!.font = "10px var(--font-mono, monospace)";
        ctx!.textAlign = "left";
        ctx!.textBaseline = "middle";
        ctx!.fillStyle = "rgba(220, 220, 200, 0.5)";
        ctx!.fillText(
          `Moon · ${moonInfo.phaseName}`,
          moonP.x + moonRadius + 6,
          moonP.y,
        );
      }

      // ── Cardinal directions ──
      const cardinals = [
        { az: 0, label: "N" },
        { az: 90, label: "E" },
        { az: 180, label: "S" },
        { az: 270, label: "W" },
      ];
      ctx!.font = "13px var(--font-mono, monospace)";
      ctx!.textAlign = "center";
      ctx!.textBaseline = "top";
      ctx!.fillStyle = "rgba(136, 136, 204, 0.3)";
      for (const c of cardinals) {
        const p = projectToScreen({ alt: 2, az: c.az }, w, h, az, fov);
        if (p.x > -50 && p.x < w + 50 && p.y > -50 && p.y < h + 50) {
          ctx!.fillText(c.label, p.x, p.y);
        }
      }
    }

    function loop() {
      draw(performance.now());
      rafRef.current = requestAnimationFrame(loop);
    }
    loop();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [birthData, scene]);

  return (
    <div className="night-sky-wrapper">
      <canvas
        ref={canvasRef}
        className="night-sky-canvas"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onWheel={handleWheel}
        style={{
          cursor: isDraggingState ? "grabbing" : "grab",
          touchAction: "none",
        }}
      />

      <SkyInfoPanel
        birthData={birthData}
        linesVisible={showConstellations}
        labelsVisible={showLabels}
        onLinesChange={() => setShowConstellations((visible) => !visible)}
        onLabelsChange={() => setShowLabels((visible) => !visible)}
      />

      <div className="night-sky-hud">
        <div className="night-sky-hud-top">
          <p className="night-sky-location mono">
            {birthData.cityName} · {birthData.local.year}-
            {String(birthData.local.month).padStart(2, "0")}-
            {String(birthData.local.day).padStart(2, "0")}{" "}
            {String(birthData.local.hour).padStart(2, "0")}:
            {String(birthData.local.minute).padStart(2, "0")}
          </p>
        </div>

        <div className="night-sky-hud-bottom">
          <button className="night-sky-reset-btn" onClick={onReset}>
            ← New sky
          </button>
          <p className="night-sky-hint mono">
            drag to pan · scroll / pinch to zoom
          </p>
          <div className="night-sky-zoom mono">FOV {Math.round(fovDeg)}°</div>
        </div>
      </div>
    </div>
  );
}
