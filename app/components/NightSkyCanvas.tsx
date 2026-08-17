"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import type { BirthData } from "../page";
import {
  toJulianDate,
  localToUTC,
  starToScreen,
  projectToScreen,
  equatorialToHorizontal,
  precessFromJ2000,
  sunEquatorial,
  normalizeDeg,
  getEclipticCurve,
  getCelestialEquatorCurve,
  type GeoLocation,
} from "../lib/astronomy";
import {
  magnitudeToRadius,
  magnitudeToOpacity,
  skyGradientForSunAltitude,
} from "../lib/coordinates";
import { getMoonInfo } from "../lib/moonPhase";
import { getAllPlanets, getActiveMeteorShowers, type MeteorShower } from "../lib/planets";
import { getDSOTypeLabel, type DSOType } from "../lib/dso";
import starsData from "../data/stars.json";
import constellationsData from "../data/constellations.json";
import dsosData from "../data/dsos.json";
import milkyWayData from "../data/milkyway.json";
import SkyInfoPanel from "./SkyInfoPanel";

/* ============================================
   NIGHT SKY CANVAS — High Precision Celestial Dome
   ~5,000 Hipparcos/Yale Bright stars, 88 IAU constellations,
   Deep Sky Objects (galaxies, nebulae, clusters), Milky Way,
   planets, moon, meteor radiants, and interactive sky inspector.
   ============================================ */

interface CatalogStar {
  hip: number;
  name: string;
  bayer: string;
  ra: number;
  dec: number;
  mag: number;
  constellation: string;
  color: string;
}

interface ConstellationDef {
  abbr: string;
  name: string;
  latin: string;
  center: [number, number];
  lines: [number, number][][];
}

interface DSODef {
  id: string;
  name: string;
  type: DSOType;
  ra: number;
  dec: number;
  mag: number | null;
  dim: string;
  constellation: string;
}

interface MilkyWayFeature {
  id: string;
  type: "Polygon" | "MultiPolygon";
  level: number;
  coordinates: [number, number][][] | [number, number][][][];
}

const stars = starsData as CatalogStar[];
const constellations = constellationsData as ConstellationDef[];
const dsos = dsosData as DSODef[];
const milkyWay = milkyWayData as MilkyWayFeature[];

interface RenderedStar {
  x: number;
  y: number;
  r: number;
  opacity: number;
  color: string;
  visible: boolean;
  name: string;
  bayer: string;
  con: string;
  mag: number;
  alt: number;
  az: number;
  twPhase: number;
}

interface RenderedDSO {
  x: number;
  y: number;
  visible: boolean;
  id: string;
  name: string;
  type: DSOType;
  mag: number | null;
  con: string;
  alt: number;
  az: number;
}

interface HoveredTarget {
  id?: string;
  name: string;
  designation?: string;
  type: string;
  constellation?: string;
  mag?: number | null;
  alt: number;
  az: number;
  x: number;
  y: number;
}

interface Meteor {
  startedAt: number;
  duration: number;
  startX: number;
  startY: number;
  distance: number;
  angle: number;
  hue: "gold" | "blue";
}

interface StarHopTarget {
  name: string;
  bayer: string;
  az: number;
  alt: number;
}

interface StarHop {
  startedAt: number;
  duration: number;
  baseAz: number;
  targetAz: number;
  basePitch: number;
  targetPitch: number;
  baseFov: number;
  targetFov: number;
  target: StarHopTarget;
}

// ── Cached hex→rgb parsing ──
const rgbCache = new Map<string, [number, number, number]>();
function parseHex(hex: string): [number, number, number] {
  let cached = rgbCache.get(hex);
  if (cached) return cached;
  const cleanHex = hex.startsWith("#") ? hex.slice(1) : hex;
  const r = parseInt(cleanHex.slice(0, 2), 16) || 200;
  const g = parseInt(cleanHex.slice(2, 4), 16) || 215;
  const b = parseInt(cleanHex.slice(4, 6), 16) || 255;
  cached = [r, g, b];
  rgbCache.set(hex, cached);
  return cached;
}

function hexToRgba(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, alpha))})`;
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
  const [starHopActive, setStarHopActive] = useState(false);

  // Layer visibility state
  const [showConstellations, setShowConstellations] = useState(true);
  const [showConstellationNames, setShowConstellationNames] = useState(true);
  const [showStarLabels, setShowStarLabels] = useState(true);
  const [showDSOs, setShowDSOs] = useState(true);
  const [showMilkyWay, setShowMilkyWay] = useState(true);
  const [showGuides, setShowGuides] = useState(true);

  // Interactive Hover Inspection state
  const [hoveredObject, setHoveredObject] = useState<HoveredTarget | null>(null);

  // Shared hit-testing ref updated in draw loop
  const projectedObjectsRef = useRef<{
    stars: RenderedStar[];
    dsos: RenderedDSO[];
    planets: { x: number; y: number; name: string; mag: number; color: string; alt: number; az: number; visible: boolean }[];
  }>({ stars: [], dsos: [], planets: [] });

  // Refs for animation loop (avoid stale closures)
  const centerAzRef = useRef(centerAz);
  const fovDegRef = useRef(fovDeg);
  const dirtyRef = useRef(true);
  const velRef = useRef(0);
  const pointerRef = useRef({ x: -1000, y: -1000, lastMovedAt: 0 });
  const reducedMotionRef = useRef(false);
  const starHopActiveRef = useRef(false);
  const starHopRef = useRef<StarHop | null>(null);
  const starHopOriginRef = useRef<{ az: number; fov: number } | null>(null);
  const starHopTargetRequestRef = useRef<StarHopTarget | null>(null);
  const flightPitchRef = useRef(0);

  const showConstellationsRef = useRef(showConstellations);
  const showConstellationNamesRef = useRef(showConstellationNames);
  const showStarLabelsRef = useRef(showStarLabels);
  const showDSOsRef = useRef(showDSOs);
  const showMilkyWayRef = useRef(showMilkyWay);
  const showGuidesRef = useRef(showGuides);
  const hoveredObjectRef = useRef<HoveredTarget | null>(null);

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
    showConstellationNamesRef.current = showConstellationNames;
  }, [showConstellationNames]);

  useEffect(() => {
    showStarLabelsRef.current = showStarLabels;
  }, [showStarLabels]);

  useEffect(() => {
    showDSOsRef.current = showDSOs;
  }, [showDSOs]);

  useEffect(() => {
    showMilkyWayRef.current = showMilkyWay;
  }, [showMilkyWay]);

  useEffect(() => {
    showGuidesRef.current = showGuides;
  }, [showGuides]);

  useEffect(() => {
    hoveredObjectRef.current = hoveredObject;
  }, [hoveredObject]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => {
      reducedMotionRef.current = media.matches;
    };
    updatePreference();
    media.addEventListener("change", updatePreference);
    return () => media.removeEventListener("change", updatePreference);
  }, []);

  // Drag state
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const dragStartAz = useRef(0);
  const lastMoveX = useRef(0);
  const lastMoveT = useRef(0);
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

  // Precompute static-ish celestial scene data once per birthData
  const scene = useMemo(() => {
    const utc = localToUTC(birthData.local, birthData.utcOffset);
    const jd = toJulianDate(utc);
    return {
      planets: getAllPlanets(jd),
      moonInfo: getMoonInfo(jd),
      activeShowers: getActiveMeteorShowers(birthData.local.month, birthData.local.day),
      eclipticCurve: getEclipticCurve(jd, 4),
      equatorCurve: getCelestialEquatorCurve(4),
    };
  }, [birthData]);

  // Active inspector targets
  const [selectedObject, setSelectedObject] = useState<HoveredTarget | null>(null);
  const selectedObjectRef = useRef<HoveredTarget | null>(null);
  const currentHoverIdRef = useRef<string | null>(null);

  useEffect(() => {
    selectedObjectRef.current = selectedObject;
  }, [selectedObject]);

  const toggleStarHop = useCallback(() => {
    if (starHopActiveRef.current) {
      const origin = starHopOriginRef.current;
      starHopActiveRef.current = false;
      starHopRef.current = null;
      starHopOriginRef.current = null;
      starHopTargetRequestRef.current = null;
      flightPitchRef.current = 0;
      velRef.current = 0;

      if (origin) {
        centerAzRef.current = origin.az;
        fovDegRef.current = origin.fov;
        dirtyRef.current = true;
        setCenterAz(origin.az);
        setFovDeg(origin.fov);
      }
      setStarHopActive(false);
      return;
    }

    // The original point of view is preserved, so this is safe to jump into and out of.
    starHopOriginRef.current = { az: centerAzRef.current, fov: fovDegRef.current };
    starHopRef.current = null;
    starHopTargetRequestRef.current = null;
    flightPitchRef.current = 0;
    fovDegRef.current = 104;
    dirtyRef.current = true;
    setFovDeg(104);
    starHopActiveRef.current = true;
    setHoveredObject(null);
    setSelectedObject(null);
    setStarHopActive(true);
  }, []);

  // Pointer & Touch handlers
  const dragStartPos = useRef({ x: 0, y: 0 });
  const hasMovedBeyondThreshold = useRef(false);

  // Shared hit-testing helper
  const findObjectAt = useCallback((x: number, y: number): HoveredTarget | null => {
    const { planets, dsos: renderedDSOs, stars: renderedStars } = projectedObjectsRef.current;

    // 1. Check planets (highest priority)
    for (const p of planets) {
      if (!p.visible) continue;
      const dist = Math.hypot(p.x - x, p.y - y);
      if (dist < 24) {
        return {
          id: `planet_${p.name}`,
          name: p.name,
          type: "Planet",
          mag: p.mag,
          alt: p.alt,
          az: p.az,
          x: p.x,
          y: p.y,
        };
      }
    }

    // 2. Check DSOs (if enabled)
    if (showDSOsRef.current) {
      for (const d of renderedDSOs) {
        if (!d.visible) continue;
        const dist = Math.hypot(d.x - x, d.y - y);
        if (dist < 22) {
          return {
            id: `dso_${d.id}`,
            name: d.name,
            designation: d.id,
            type: getDSOTypeLabel(d.type),
            constellation: d.con,
            mag: d.mag,
            alt: d.alt,
            az: d.az,
            x: d.x,
            y: d.y,
          };
        }
      }
    }

    // 3. Check prominent stars
    let bestStar: RenderedStar | null = null;
    let bestDist = 20;
    for (const s of renderedStars) {
      if (!s.visible) continue;
      const dist = Math.hypot(s.x - x, s.y - y);
      if (dist < bestDist) {
        bestStar = s;
        bestDist = dist;
      }
    }

    if (bestStar) {
      return {
        id: `star_${bestStar.name || bestStar.bayer || bestStar.mag}_${Math.round(bestStar.alt)}_${Math.round(bestStar.az)}`,
        name: bestStar.name || bestStar.bayer || `HIP Star (${bestStar.mag.toFixed(1)}m)`,
        designation: bestStar.bayer || undefined,
        type: "Star",
        constellation: bestStar.con || undefined,
        mag: bestStar.mag,
        alt: bestStar.alt,
        az: bestStar.az,
        x: bestStar.x,
        y: bestStar.y,
      };
    }

    return null;
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pointerRef.current = { x: e.clientX, y: e.clientY, lastMovedAt: performance.now() };
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      pinchDist.current = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchFov.current = fovDegRef.current;
      isDragging.current = false;
      setIsDraggingState(false);
      return;
    }

    dragStartPos.current = { x: e.clientX, y: e.clientY };
    hasMovedBeyondThreshold.current = false;
    isDragging.current = false;
    dragStartX.current = e.clientX;
    dragStartAz.current = centerAzRef.current;
    lastMoveX.current = e.clientX;
    lastMoveT.current = performance.now();
    velRef.current = 0;
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    pointerRef.current = { x: e.clientX, y: e.clientY, lastMovedAt: performance.now() };
    if (pointers.current.has(e.pointerId)) {
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    // Pinch zoom
    if (pointers.current.size === 2) {
      const pts = [...pointers.current.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (pinchDist.current > 0) {
        const ratio = pinchDist.current / dist;
        setFovDeg(Math.max(30, Math.min(180, pinchFov.current * ratio)));
      }
      return;
    }

    // Check movement threshold before enabling drag
    const moveDist = Math.hypot(
      e.clientX - dragStartPos.current.x,
      e.clientY - dragStartPos.current.y
    );

    if (pointers.current.has(e.pointerId) && moveDist > 6) {
      hasMovedBeyondThreshold.current = true;
      isDragging.current = true;
      setIsDraggingState(true);

      const dx = e.clientX - dragStartX.current;
      const degreesPerPx = 0.3 * (fovDegRef.current / 180);
      const newAz = normalizeDeg(dragStartAz.current - dx * degreesPerPx);
      setCenterAz(newAz);

      const now = performance.now();
      const dt = now - lastMoveT.current;
      if (dt > 0) {
        const moveDx = e.clientX - lastMoveX.current;
        velRef.current = -moveDx * degreesPerPx * (16 / dt);
      }
      lastMoveX.current = e.clientX;
      lastMoveT.current = now;

      if (currentHoverIdRef.current !== null) {
        currentHoverIdRef.current = null;
        setHoveredObject(null);
      }
      return;
    }

    // Hover inspection when pointer is moving freely (not dragging)
    if (!isDragging.current) {
      const found = findObjectAt(e.clientX, e.clientY);
      const newId = found ? (found.id || found.name) : null;

      // Only trigger state update when hover identity actually changes (prevents buzzing)
      if (newId !== currentHoverIdRef.current) {
        currentHoverIdRef.current = newId;
        setHoveredObject(found);
      }
    }
  }, [findObjectAt]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinchDist.current = 0;

    if (starHopActiveRef.current) {
      if (!hasMovedBeyondThreshold.current) {
        const clicked = findObjectAt(e.clientX, e.clientY);
        if (clicked?.type === "Star") {
          starHopTargetRequestRef.current = {
            name: clicked.name,
            bayer: clicked.designation || "",
            az: clicked.az,
            alt: clicked.alt,
          };
          setSelectedObject(clicked);
        }
      }
      if (pointers.current.size === 0) {
        isDragging.current = false;
        setIsDraggingState(false);
      }
      return;
    }

    // Check if this was a click/tap (no drag)
    if (!hasMovedBeyondThreshold.current) {
      const clicked = findObjectAt(e.clientX, e.clientY);
      if (clicked) {
        setSelectedObject((prev) => (prev?.id === clicked.id ? null : clicked));
      } else {
        setSelectedObject(null);
      }
    }

    if (pointers.current.size === 0) {
      isDragging.current = false;
      setIsDraggingState(false);
    }
  }, [findObjectAt]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setFovDeg((prev) => {
      const factor = e.deltaY > 0 ? 1.08 : 0.92;
      return Math.max(30, Math.min(180, prev * factor));
    });
  }, []);

  // Main Canvas Setup & Render Loop
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
    const activeShowers = scene.activeShowers;
    const eclipticCurve = scene.eclipticCurve;
    const equatorCurve = scene.equatorCurve;

    // Pre-allocated Render buffers
    const renderedStars: RenderedStar[] = new Array(stars.length);
    for (let i = 0; i < stars.length; i++) {
      renderedStars[i] = {
        x: 0,
        y: 0,
        r: magnitudeToRadius(stars[i].mag),
        opacity: magnitudeToOpacity(stars[i].mag),
        color: stars[i].color || "#cad7ff",
        visible: false,
        name: stars[i].name,
        bayer: stars[i].bayer,
        con: stars[i].constellation,
        mag: stars[i].mag,
        alt: 0,
        az: 0,
        twPhase: (stars[i].ra * 12.9898 + stars[i].dec * 78.233) % (Math.PI * 2),
      };
    }

    const renderedDSOs: RenderedDSO[] = new Array(dsos.length);
    for (let i = 0; i < dsos.length; i++) {
      renderedDSOs[i] = {
        x: 0,
        y: 0,
        visible: false,
        id: dsos[i].id,
        name: dsos[i].name,
        type: dsos[i].type,
        mag: dsos[i].mag,
        con: dsos[i].constellation,
        alt: 0,
        az: 0,
      };
    }

    const renderedPlanets = planets.map((p) => ({
      x: 0,
      y: 0,
      name: p.name,
      mag: p.mag,
      color: p.color,
      alt: 0,
      az: 0,
      visible: false,
    }));

    // Pre-projected guide buffers
    let renderedEcliptic: { x: number; y: number; visible: boolean }[] = [];
    let renderedEquator: { x: number; y: number; visible: boolean }[] = [];
    let renderedConstCenters: { x: number; y: number; visible: boolean; name: string; latin: string }[] = [];
    let renderedRadiants: { x: number; y: number; visible: boolean; shower: MeteorShower }[] = [];
    const meteors: Meteor[] = [];
    const warpParticles = Array.from({ length: 82 }, (_, index) => ({
      angle: (index * 2.399963229728653) % (Math.PI * 2),
      seed: ((index * 37) % 101) / 101,
      weight: 0.25 + ((index * 17) % 70) / 100,
    }));

    function scheduleMeteor(now: number, offset = 0) {
      const angle = 0.42 + Math.random() * 0.26;
      meteors.push({
        startedAt: now + offset,
        duration: 520 + Math.random() * 330,
        startX: w * (0.08 + Math.random() * 0.7),
        startY: h * (0.06 + Math.random() * 0.42),
        distance: Math.max(w, h) * (0.19 + Math.random() * 0.18),
        angle,
        hue: Math.random() > 0.72 ? "blue" : "gold",
      });
    }

    function drawMeteor(meteor: Meteor, now: number) {
      const progress = (now - meteor.startedAt) / meteor.duration;
      if (progress < 0 || progress > 1) return false;

      const eased = 1 - (1 - progress) * (1 - progress);
      const headX = meteor.startX + Math.cos(meteor.angle) * meteor.distance * eased;
      const headY = meteor.startY + Math.sin(meteor.angle) * meteor.distance * eased;
      const tailLength = meteor.distance * (0.12 + progress * 0.08);
      const tailX = headX - Math.cos(meteor.angle) * tailLength;
      const tailY = headY - Math.sin(meteor.angle) * tailLength;
      const fade = Math.sin(Math.min(1, progress * 2) * Math.PI / 2) * (1 - progress * 0.3);
      const color = meteor.hue === "gold" ? "255, 220, 172" : "176, 220, 255";

      ctx!.save();
      ctx!.globalCompositeOperation = "lighter";
      const trail = ctx!.createLinearGradient(tailX, tailY, headX, headY);
      trail.addColorStop(0, `rgba(${color}, 0)`);
      trail.addColorStop(0.72, `rgba(${color}, ${0.18 * fade})`);
      trail.addColorStop(1, `rgba(255, 255, 255, ${0.95 * fade})`);
      ctx!.strokeStyle = trail;
      ctx!.lineWidth = 1.1 + progress * 0.8;
      ctx!.beginPath();
      ctx!.moveTo(tailX, tailY);
      ctx!.lineTo(headX, headY);
      ctx!.stroke();

      const glow = ctx!.createRadialGradient(headX, headY, 0, headX, headY, 12);
      glow.addColorStop(0, `rgba(255, 255, 255, ${fade})`);
      glow.addColorStop(0.25, `rgba(${color}, ${0.42 * fade})`);
      glow.addColorStop(1, `rgba(${color}, 0)`);
      ctx!.fillStyle = glow;
      ctx!.fillRect(headX - 12, headY - 12, 24, 24);
      ctx!.restore();
      return true;
    }

    function startStarFlight(target: StarHopTarget, now: number) {
      const baseAz = centerAzRef.current;
      const turn = ((target.az - baseAz + 540) % 360) - 180;
      starHopRef.current = {
        startedAt: now,
        duration: 2200,
        baseAz,
        targetAz: normalizeDeg(baseAz + turn),
        basePitch: flightPitchRef.current,
        targetPitch: target.alt,
        baseFov: fovDegRef.current,
        targetFov: Math.max(19, Math.min(31, fovDegRef.current * 0.3)),
        target,
      };
    }

    function updateStarFlightCamera(now: number) {
      if (!starHopActiveRef.current || reducedMotionRef.current) return;
      const requestedTarget = starHopTargetRequestRef.current;
      if (requestedTarget) {
        starHopTargetRequestRef.current = null;
        startStarFlight(requestedTarget, now);
        return;
      }

      const hop = starHopRef.current;
      if (!hop) return;

      const progress = Math.min(1, Math.max(0, (now - hop.startedAt) / hop.duration));
      const eased = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;
      const turn = ((hop.targetAz - hop.baseAz + 540) % 360) - 180;
      centerAzRef.current = normalizeDeg(hop.baseAz + turn * eased);
      flightPitchRef.current = hop.basePitch + (hop.targetPitch - hop.basePitch) * eased;
      fovDegRef.current = hop.baseFov + (hop.targetFov - hop.baseFov) * Math.sin(progress * Math.PI * 0.5);
      dirtyRef.current = true;

      if (progress === 1) {
        centerAzRef.current = hop.targetAz;
        flightPitchRef.current = hop.targetPitch;
        fovDegRef.current = hop.targetFov;
        setCenterAz(hop.targetAz);
        setFovDeg(hop.targetFov);
        starHopRef.current = null;
      }
    }

    function projectFlightPoint(
      alt: number,
      objectAz: number,
      cameraAz: number,
      cameraFov: number,
    ) {
      const relAz = normalizeDeg(objectAz - cameraAz);
      const centeredAz = relAz > 180 ? relAz - 360 : relAz;
      const relAlt = alt - flightPitchRef.current;
      const focal = Math.min(w, h) / (2 * Math.tan((cameraFov * Math.PI / 180) / 2));
      const x = w / 2 + Math.tan((centeredAz * Math.PI) / 180) * focal;
      const y = h * 0.53 - Math.tan((relAlt * Math.PI) / 180) * focal;
      const visible = Math.abs(centeredAz) < cameraFov * 0.58
        && Math.abs(relAlt) < 72
        && x > -80 && x < w + 80 && y > -80 && y < h + 80;
      return { x, y, visible, alt, az: objectAz };
    }

    function projectScenePoint(
      eq: { ra: number; dec: number },
      cameraAz: number,
      cameraFov: number,
    ) {
      const skyPoint = starToScreen(eq, loc, jd, w, h, cameraAz, cameraFov);
      return starHopActiveRef.current
        ? projectFlightPoint(skyPoint.alt, skyPoint.az, cameraAz, cameraFov)
        : skyPoint;
    }

    function projectHorizontalPoint(
      alt: number,
      objectAz: number,
      cameraAz: number,
      cameraFov: number,
    ) {
      return starHopActiveRef.current
        ? projectFlightPoint(alt, objectAz, cameraAz, cameraFov)
        : projectToScreen({ alt, az: objectAz }, w, h, cameraAz, cameraFov);
    }

    function drawStarHopWarp(now: number) {
      const hop = starHopRef.current;
      if (!hop) return;
      const progress = Math.min(1, Math.max(0, (now - hop.startedAt) / hop.duration));
      const velocity = Math.sin(progress * Math.PI);
      if (velocity < 0.04) return;

      const target = renderedStars.find(
        (star) => star.name === hop.target.name && star.bayer === hop.target.bayer,
      );
      const focalX = target?.x ?? w * 0.5;
      const focalY = target?.y ?? h * 0.45;
      const maxRadius = Math.hypot(w, h) * 0.7;

      ctx!.save();
      ctx!.globalCompositeOperation = "screen";
      ctx!.fillStyle = `rgba(3, 5, 22, ${0.16 * velocity})`;
      ctx!.fillRect(0, 0, w, h);

      for (const particle of warpParticles) {
        const cycle = (particle.seed + progress * (1.5 + particle.weight)) % 1;
        const outer = maxRadius * cycle;
        const inner = Math.max(8, outer - maxRadius * (0.11 + particle.weight * 0.1));
        const cos = Math.cos(particle.angle);
        const sin = Math.sin(particle.angle);
        const trail = ctx!.createLinearGradient(
          focalX + cos * inner,
          focalY + sin * inner,
          focalX + cos * outer,
          focalY + sin * outer,
        );
        const blue = particle.seed > 0.72;
        const color = blue ? "155, 206, 255" : "255, 224, 181";
        trail.addColorStop(0, `rgba(${color}, 0)`);
        trail.addColorStop(0.7, `rgba(${color}, ${0.11 * velocity * particle.weight})`);
        trail.addColorStop(1, `rgba(255, 255, 255, ${0.5 * velocity * particle.weight})`);
        ctx!.strokeStyle = trail;
        ctx!.lineWidth = 0.55 + particle.weight * 1.25;
        ctx!.beginPath();
        ctx!.moveTo(focalX + cos * inner, focalY + sin * inner);
        ctx!.lineTo(focalX + cos * outer, focalY + sin * outer);
        ctx!.stroke();
      }

      const arrival = ctx!.createRadialGradient(focalX, focalY, 0, focalX, focalY, 64);
      arrival.addColorStop(0, `rgba(255, 255, 255, ${0.5 * velocity})`);
      arrival.addColorStop(0.12, `rgba(184, 210, 255, ${0.2 * velocity})`);
      arrival.addColorStop(1, "rgba(184, 210, 255, 0)");
      ctx!.fillStyle = arrival;
      ctx!.fillRect(focalX - 64, focalY - 64, 128, 128);
      ctx!.restore();

      ctx!.save();
      ctx!.textAlign = "center";
      ctx!.textBaseline = "bottom";
      ctx!.font = "10px var(--font-mono, monospace)";
      ctx!.fillStyle = `rgba(225, 232, 255, ${0.5 + velocity * 0.4})`;
      ctx!.fillText(`FLIGHT LOCK · ${hop.target.name.toUpperCase()}`, focalX, Math.max(30, focalY - 28));
      ctx!.restore();
    }

    function drawFlightInterface() {
      if (!starHopActiveRef.current) return;
      const focal = Math.min(w, h) / (2 * Math.tan((fovDegRef.current * Math.PI / 180) / 2));
      const horizonY = h * 0.53 + Math.tan((flightPitchRef.current * Math.PI) / 180) * focal;
      const cx = w / 2;
      const cy = h * 0.53;

      ctx!.save();
      const horizon = ctx!.createLinearGradient(0, horizonY, w, horizonY);
      horizon.addColorStop(0, "rgba(164, 190, 255, 0)");
      horizon.addColorStop(0.25, "rgba(164, 190, 255, 0.16)");
      horizon.addColorStop(0.75, "rgba(164, 190, 255, 0.16)");
      horizon.addColorStop(1, "rgba(164, 190, 255, 0)");
      ctx!.strokeStyle = horizon;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.moveTo(0, horizonY);
      ctx!.lineTo(w, horizonY);
      ctx!.stroke();

      ctx!.strokeStyle = "rgba(235, 242, 255, 0.46)";
      ctx!.lineWidth = 0.8;
      ctx!.beginPath();
      ctx!.arc(cx, cy, 13, 0, Math.PI * 2);
      ctx!.moveTo(cx - 21, cy);
      ctx!.lineTo(cx - 7, cy);
      ctx!.moveTo(cx + 7, cy);
      ctx!.lineTo(cx + 21, cy);
      ctx!.moveTo(cx, cy - 21);
      ctx!.lineTo(cx, cy - 7);
      ctx!.moveTo(cx, cy + 7);
      ctx!.lineTo(cx, cy + 21);
      ctx!.stroke();

      ctx!.font = "10px var(--font-mono, monospace)";
      ctx!.textAlign = "center";
      ctx!.textBaseline = "bottom";
      ctx!.fillStyle = "rgba(222, 230, 255, 0.62)";
      ctx!.fillText(
        starHopRef.current ? "APPROACHING SELECTED STAR" : "CLICK A BRIGHT STAR TO FLY",
        cx,
        h - 48,
      );
      ctx!.restore();
    }

    // Projection Function: runs only when camera moves or resizes
    function projectAll(az: number, fov: number) {
      // 1. Project Stars
      for (let i = 0; i < stars.length; i++) {
        const p = projectScenePoint(
          { ra: stars[i].ra, dec: stars[i].dec },
          az,
          fov,
        );
        const s = renderedStars[i];
        s.x = p.x;
        s.y = p.y;
        s.visible = p.visible;
        s.alt = p.alt;
        s.az = p.az;
      }

      // 2. Project DSOs
      for (let i = 0; i < dsos.length; i++) {
        const p = projectScenePoint(
          { ra: dsos[i].ra, dec: dsos[i].dec },
          az,
          fov,
        );
        const d = renderedDSOs[i];
        d.x = p.x;
        d.y = p.y;
        d.visible = p.visible;
        d.alt = p.alt;
        d.az = p.az;
      }

      // 3. Project Planets
      for (let i = 0; i < planets.length; i++) {
        const eqOfDate = precessFromJ2000(planets[i].equatorial, jd);
        const horiz = equatorialToHorizontal(eqOfDate, loc, jd);
        const p = projectHorizontalPoint(horiz.alt, horiz.az, az, fov);
        const rp = renderedPlanets[i];
        rp.x = p.x;
        rp.y = p.y;
        rp.visible = p.visible;
        rp.alt = p.alt;
        rp.az = p.az;
      }

      // 4. Project Constellation Centroids
      renderedConstCenters = constellations.map((c) => {
        const p = projectScenePoint(
          { ra: c.center[0], dec: c.center[1] },
          az,
          fov,
        );
        return {
          x: p.x,
          y: p.y,
          visible: p.visible,
          name: c.name,
          latin: c.latin,
        };
      });

      // 5. Project Guides (Ecliptic & Celestial Equator)
      renderedEcliptic = eclipticCurve.map((eq) => projectScenePoint(eq, az, fov));
      renderedEquator = equatorCurve.map((eq) => projectScenePoint(eq, az, fov));

      // 6. Project Meteor Radiants
      renderedRadiants = activeShowers.map((shower) => {
        const p = projectScenePoint(shower.radiant, az, fov);
        return { x: p.x, y: p.y, visible: p.visible, shower };
      });

      // Update shared hit-test ref
      projectedObjectsRef.current = {
        stars: renderedStars,
        dsos: renderedDSOs,
        planets: renderedPlanets,
      };
    }

    const skyColors = skyGradientForSunAltitude(sunAlt.current);
    let sceneStartedAt = 0;

    function draw(now: number) {
      if (!sceneStartedAt) {
        sceneStartedAt = now;
        if (!reducedMotionRef.current) {
          scheduleMeteor(now, 1600);
          scheduleMeteor(now, 6400);
        }
      }
      updateStarFlightCamera(now);
      // Apply panning inertia
      if (!starHopActiveRef.current && !isDragging.current && Math.abs(velRef.current) > 0.01) {
        const newAz = normalizeDeg(centerAzRef.current + velRef.current);
        centerAzRef.current = newAz;
        setCenterAz(newAz);
        velRef.current *= 0.92;
        dirtyRef.current = true;
      } else if (Math.abs(velRef.current) <= 0.01) {
        velRef.current = 0;
      }

      const az = centerAzRef.current;
      const fov = fovDegRef.current;

      if (dirtyRef.current) {
        projectAll(az, fov);
        dirtyRef.current = false;
      }

      // ── Sky Gradient Background ──
      const grad = ctx!.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, skyColors.zenith);
      grad.addColorStop(0.5, skyColors.mid);
      grad.addColorStop(1, skyColors.horizon);
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, w, h);

      // A very soft, moving atmospheric bloom makes the dome feel deep rather than flat.
      if (!reducedMotionRef.current) {
        const drift = Math.sin(now * 0.00012) * w * 0.12;
        const bloom = ctx!.createRadialGradient(
          w * 0.5 + drift,
          h * 0.83,
          0,
          w * 0.5 + drift,
          h * 0.83,
          Math.max(w, h) * 0.62,
        );
        bloom.addColorStop(0, "rgba(116, 100, 196, 0.075)");
        bloom.addColorStop(0.45, "rgba(54, 87, 170, 0.025)");
        bloom.addColorStop(1, "rgba(10, 10, 26, 0)");
        ctx!.fillStyle = bloom;
        ctx!.fillRect(0, 0, w, h);
      }

      // ── Milky Way Galactic Band ──
      if (showMilkyWayRef.current) {
        ctx!.save();
        for (const feature of milkyWay) {
          const baseAlpha = feature.level === 1 ? 0.03 : feature.level === 2 ? 0.05 : 0.08;
          ctx!.fillStyle = `rgba(180, 205, 255, ${baseAlpha})`;

          const polys = feature.type === "MultiPolygon"
            ? (feature.coordinates as [number, number][][][])
            : [(feature.coordinates as [number, number][][])];

          for (const poly of polys) {
            for (const ring of poly) {
              if (ring.length < 3) continue;
              ctx!.beginPath();
              let started = false;
              let hasVisible = false;

              for (let i = 0; i < ring.length; i++) {
                const pt = ring[i];
                const p = projectScenePoint({ ra: pt[0], dec: pt[1] }, az, fov);
                if (p.visible) hasVisible = true;

                if (!started) {
                  ctx!.moveTo(p.x, p.y);
                  started = true;
                } else {
                  ctx!.lineTo(p.x, p.y);
                }
              }

              if (hasVisible) {
                ctx!.closePath();
                ctx!.fill();
              }
            }
          }
        }
        ctx!.restore();
      }

      // ── Horizon Ring ──
      ctx!.beginPath();
      let startedHorizon = false;
      for (let hAz = 0; hAz <= 360; hAz += 2) {
        const p = projectHorizontalPoint(0, hAz, az, fov);
        if (!startedHorizon) {
          ctx!.moveTo(p.x, p.y);
          startedHorizon = true;
        } else {
          ctx!.lineTo(p.x, p.y);
        }
      }
      ctx!.strokeStyle = "rgba(136, 136, 204, 0.12)";
      ctx!.lineWidth = 1;
      ctx!.stroke();

      // ── Celestial Guides (Ecliptic & Equator) ──
      if (showGuidesRef.current) {
        // Ecliptic Line (Solar & Planetary orbital plane)
        ctx!.strokeStyle = "rgba(220, 180, 80, 0.20)";
        ctx!.lineWidth = 1;
        ctx!.setLineDash([4, 6]);
        ctx!.beginPath();
        let eclStarted = false;
        for (let i = 0; i < renderedEcliptic.length; i++) {
          const pt = renderedEcliptic[i];
          if (!pt.visible) {
            eclStarted = false;
            continue;
          }
          if (!eclStarted) {
            ctx!.moveTo(pt.x, pt.y);
            eclStarted = true;
          } else {
            const prev = renderedEcliptic[i - 1];
            if (Math.hypot(pt.x - prev.x, pt.y - prev.y) < w * 0.3) {
              ctx!.lineTo(pt.x, pt.y);
            } else {
              ctx!.moveTo(pt.x, pt.y);
            }
          }
        }
        ctx!.stroke();

        // Celestial Equator
        ctx!.strokeStyle = "rgba(160, 150, 240, 0.16)";
        ctx!.setLineDash([2, 8]);
        ctx!.beginPath();
        let eqStarted = false;
        for (let i = 0; i < renderedEquator.length; i++) {
          const pt = renderedEquator[i];
          if (!pt.visible) {
            eqStarted = false;
            continue;
          }
          if (!eqStarted) {
            ctx!.moveTo(pt.x, pt.y);
            eqStarted = true;
          } else {
            const prev = renderedEquator[i - 1];
            if (Math.hypot(pt.x - prev.x, pt.y - prev.y) < w * 0.3) {
              ctx!.lineTo(pt.x, pt.y);
            } else {
              ctx!.moveTo(pt.x, pt.y);
            }
          }
        }
        ctx!.stroke();
        ctx!.setLineDash([]);
      }

      // ── Constellation Lines (all 88 IAU constellations) ──
      if (showConstellationsRef.current) {
        ctx!.strokeStyle = "rgba(136, 136, 204, 0.14)";
        ctx!.lineWidth = 0.8;
        ctx!.beginPath();

        for (const constellation of constellations) {
          for (const segment of constellation.lines) {
            if (segment.length < 2) continue;
            for (let i = 0; i < segment.length - 1; i++) {
              const pt1 = segment[i];
              const pt2 = segment[i + 1];
              const p1 = projectScenePoint({ ra: pt1[0], dec: pt1[1] }, az, fov);
              const p2 = projectScenePoint({ ra: pt2[0], dec: pt2[1] }, az, fov);
              if (!p1.visible && !p2.visible) continue;

              const dx = Math.abs(p1.x - p2.x);
              const dy = Math.abs(p1.y - p2.y);
              if (dx > w * 0.35 || dy > h * 0.35) continue;

              ctx!.moveTo(p1.x, p1.y);
              ctx!.lineTo(p2.x, p2.y);
            }
          }
        }
        ctx!.stroke();
      }

      // ── Deep Sky Objects (Messier & NGC) ──
      if (showDSOsRef.current) {
        for (const dso of renderedDSOs) {
          if (!dso.visible) continue;

          ctx!.save();
          if (dso.type === "galaxy") {
            // Tilted elliptical galaxy halo
            ctx!.translate(dso.x, dso.y);
            ctx!.rotate(0.6);
            const galGrad = ctx!.createRadialGradient(0, 0, 1, 0, 0, 10);
            galGrad.addColorStop(0, "rgba(230, 220, 255, 0.35)");
            galGrad.addColorStop(0.5, "rgba(180, 190, 255, 0.12)");
            galGrad.addColorStop(1, "transparent");
            ctx!.fillStyle = galGrad;
            ctx!.beginPath();
            ctx!.ellipse(0, 0, 12, 6, 0, 0, Math.PI * 2);
            ctx!.fill();

            // Diamond core
            ctx!.strokeStyle = "rgba(220, 230, 255, 0.4)";
            ctx!.lineWidth = 0.8;
            ctx!.strokeRect(-2, -2, 4, 4);
          } else if (dso.type === "globular_cluster" || dso.type === "open_cluster") {
            // Cluster: dashed circle with stippled core
            ctx!.beginPath();
            ctx!.arc(dso.x, dso.y, 6, 0, Math.PI * 2);
            ctx!.strokeStyle = "rgba(240, 230, 200, 0.35)";
            ctx!.setLineDash([2, 2]);
            ctx!.lineWidth = 0.8;
            ctx!.stroke();

            ctx!.beginPath();
            ctx!.arc(dso.x, dso.y, 2, 0, Math.PI * 2);
            ctx!.fillStyle = "rgba(255, 245, 220, 0.6)";
            ctx!.fill();
          } else {
            // Nebulae: diffuse cloud glow
            const nebGrad = ctx!.createRadialGradient(dso.x, dso.y, 1, dso.x, dso.y, 14);
            nebGrad.addColorStop(0, "rgba(100, 240, 220, 0.3)");
            nebGrad.addColorStop(0.6, "rgba(220, 120, 200, 0.12)");
            nebGrad.addColorStop(1, "transparent");
            ctx!.fillStyle = nebGrad;
            ctx!.beginPath();
            ctx!.arc(dso.x, dso.y, 14, 0, Math.PI * 2);
            ctx!.fill();

            ctx!.strokeStyle = "rgba(140, 230, 220, 0.4)";
            ctx!.lineWidth = 0.8;
            ctx!.beginPath();
            ctx!.arc(dso.x, dso.y, 3, 0, Math.PI * 2);
            ctx!.stroke();
          }
          ctx!.restore();

          // DSO Label
          if (fov <= 120 || (dso.mag !== null && dso.mag <= 5.0)) {
            ctx!.font = "9px var(--font-mono, monospace)";
            ctx!.textAlign = "left";
            ctx!.textBaseline = "middle";
            ctx!.fillStyle = "rgba(180, 220, 255, 0.45)";
            ctx!.fillText(dso.name, dso.x + 8, dso.y);
          }
        }
      }

      // ── Stars (~5,000 Hipparcos catalog) ──
      const twinkleTime = now * 0.0015;
      for (let i = 0; i < renderedStars.length; i++) {
        const star = renderedStars[i];
        if (!star.visible) continue;

        const twinkle = Math.sin(twinkleTime + star.twPhase) * 0.15;
        const alpha = Math.max(0.1, Math.min(1, star.opacity + twinkle));

        // Bright stars (mag < 2.0): luminous halo glow
        if (star.mag < 2.0) {
          ctx!.beginPath();
          ctx!.arc(star.x, star.y, star.r * 3.5, 0, Math.PI * 2);
          ctx!.fillStyle = hexToRgba(star.color, alpha * 0.12);
          ctx!.fill();

          ctx!.beginPath();
          ctx!.arc(star.x, star.y, star.r * 2.0, 0, Math.PI * 2);
          ctx!.fillStyle = hexToRgba(star.color, alpha * 0.25);
          ctx!.fill();

          // Fine diffraction spikes give only the brightest stars a cinematic shimmer.
          if (star.mag < 0.8) {
            const spike = star.r * (4.5 + Math.sin(twinkleTime * 0.65 + star.twPhase) * 0.8);
            ctx!.save();
            ctx!.translate(star.x, star.y);
            ctx!.rotate(star.twPhase * 0.18);
            ctx!.strokeStyle = hexToRgba(star.color, alpha * 0.38);
            ctx!.lineWidth = 0.55;
            ctx!.beginPath();
            ctx!.moveTo(-spike, 0);
            ctx!.lineTo(spike, 0);
            ctx!.moveTo(0, -spike);
            ctx!.lineTo(0, spike);
            ctx!.stroke();
            ctx!.restore();
          }
        }

        // Star Core
        ctx!.beginPath();
        ctx!.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        ctx!.fillStyle = hexToRgba(star.color, alpha);
        ctx!.fill();
      }

      // ── Star Labels ──
      if (showStarLabelsRef.current) {
        ctx!.font = "10px var(--font-mono, monospace)";
        ctx!.textAlign = "left";
        ctx!.textBaseline = "middle";
        ctx!.fillStyle = "rgba(200, 210, 255, 0.45)";

        // Adaptive magnitude threshold based on zoom FOV
        const magThreshold = fov <= 60 ? 3.5 : fov <= 100 ? 2.5 : 1.6;

        for (let i = 0; i < renderedStars.length; i++) {
          const star = renderedStars[i];
          if (!star.visible || star.mag > magThreshold || !star.name) continue;
          ctx!.fillText(star.name, star.x + star.r + 4, star.y);
        }
      }

      // ── Constellation Names ──
      if (showConstellationNamesRef.current) {
        ctx!.font = "11px var(--font-body, sans-serif)";
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillStyle = "rgba(136, 136, 204, 0.25)";

        for (const center of renderedConstCenters) {
          if (!center.visible) continue;
          ctx!.fillText(center.name, center.x, center.y);
        }
      }

      // ── Planets ──
      for (const planet of renderedPlanets) {
        if (!planet.visible) continue;

        // Outer glow
        ctx!.beginPath();
        ctx!.arc(planet.x, planet.y, 9, 0, Math.PI * 2);
        ctx!.fillStyle = hexToRgba(planet.color, 0.15);
        ctx!.fill();

        // Planet disk
        ctx!.beginPath();
        ctx!.arc(planet.x, planet.y, 3.8, 0, Math.PI * 2);
        ctx!.fillStyle = planet.color;
        ctx!.fill();

        ctx!.font = "10px var(--font-mono, monospace)";
        ctx!.textAlign = "left";
        ctx!.textBaseline = "middle";
        ctx!.fillStyle = hexToRgba(planet.color, 0.85);
        ctx!.fillText(
          `${planet.name} (${planet.mag > 0 ? `+${planet.mag.toFixed(1)}` : planet.mag.toFixed(1)}m)`,
          planet.x + 8,
          planet.y,
        );
      }

      // ── Moon ──
      const moonHoriz = equatorialToHorizontal(moonEq, loc, jd);
      const moonP = projectHorizontalPoint(moonHoriz.alt, moonHoriz.az, az, fov);
      if (moonP.visible) {
        const moonRadius = 11 * (180 / fov);

        const glowGrad = ctx!.createRadialGradient(
          moonP.x,
          moonP.y,
          moonRadius * 0.5,
          moonP.x,
          moonP.y,
          moonRadius * 4,
        );
        glowGrad.addColorStop(0, "rgba(220, 220, 200, 0.08)");
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
        ctx!.fillStyle = "rgba(235, 230, 215, 0.92)";
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
          ctx!.fillStyle = "rgba(5, 5, 16, 0.88)";
          ctx!.fill();
          ctx!.restore();
        }

        ctx!.font = "10px var(--font-mono, monospace)";
        ctx!.textAlign = "left";
        ctx!.textBaseline = "middle";
        ctx!.fillStyle = "rgba(220, 220, 200, 0.6)";
        ctx!.fillText(
          `Moon · ${moonInfo.phaseName} (${Math.round(moonInfo.illumination * 100)}%)`,
          moonP.x + moonRadius + 7,
          moonP.y,
        );
      }

      // ── Active Meteor Shower Radiants ──
      for (const item of renderedRadiants) {
        if (!item.visible) continue;
        ctx!.save();
        ctx!.font = "12px sans-serif";
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillStyle = item.shower.isPeak ? "#ffd2a1" : "rgba(255, 210, 161, 0.6)";
        ctx!.fillText("☄", item.x, item.y);

        ctx!.font = "9px var(--font-mono, monospace)";
        ctx!.textAlign = "left";
        ctx!.fillStyle = "rgba(255, 210, 161, 0.7)";
        ctx!.fillText(`${item.shower.name} Radiant`, item.x + 10, item.y);
        ctx!.restore();
      }

      // Every sky gets a few fleeting moments. Meteors are visual-only and never alter the birth chart.
      if (!reducedMotionRef.current) {
        for (let i = meteors.length - 1; i >= 0; i--) {
          if (!drawMeteor(meteors[i], now) && now > meteors[i].startedAt + meteors[i].duration) {
            meteors.splice(i, 1);
            scheduleMeteor(now, 7000 + Math.random() * 11000);
          }
        }
      }

      // ── Interactive Selection & Hover Reticle ──
      const activeReticle = selectedObjectRef.current || hoveredObjectRef.current;
      if (activeReticle) {
        ctx!.save();
        ctx!.strokeStyle = selectedObjectRef.current
          ? "rgba(200, 160, 80, 0.95)"
          : "rgba(200, 160, 80, 0.75)";
        ctx!.lineWidth = selectedObjectRef.current ? 1.6 : 1.2;
        ctx!.setLineDash([3, 3]);
        const pulse = 10 + Math.sin(now * 0.006) * 2;
        ctx!.beginPath();
        ctx!.arc(activeReticle.x, activeReticle.y, pulse, 0, Math.PI * 2);
        ctx!.stroke();
        ctx!.restore();
      }

      // A restrained proximity glow rewards exploration without obscuring the real sky.
      const pointer = pointerRef.current;
      if (!starHopActiveRef.current && !reducedMotionRef.current && now - pointer.lastMovedAt < 1800) {
        const focus = ctx!.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 105);
        focus.addColorStop(0, "rgba(188, 198, 255, 0.075)");
        focus.addColorStop(0.52, "rgba(130, 148, 255, 0.022)");
        focus.addColorStop(1, "rgba(130, 148, 255, 0)");
        ctx!.fillStyle = focus;
        ctx!.fillRect(pointer.x - 105, pointer.y - 105, 210, 210);
      }

      // ── Cardinal Directions (N, NE, E, SE, S, SW, W, NW) ──
      const cardinals = [
        { az: 0, label: "N" },
        { az: 45, label: "NE" },
        { az: 90, label: "E" },
        { az: 135, label: "SE" },
        { az: 180, label: "S" },
        { az: 225, label: "SW" },
        { az: 270, label: "W" },
        { az: 315, label: "NW" },
      ];

      ctx!.textAlign = "center";
      ctx!.textBaseline = "top";
      for (const c of cardinals) {
        const isMain = c.label.length === 1;
        ctx!.font = isMain ? "12px var(--font-mono, monospace)" : "9px var(--font-mono, monospace)";
        ctx!.fillStyle = isMain ? "rgba(136, 136, 204, 0.45)" : "rgba(136, 136, 204, 0.2)";
        const p = projectHorizontalPoint(2, c.az, az, fov);
        if (p.x > -40 && p.x < w + 40 && p.y > -40 && p.y < h + 40) {
          ctx!.fillText(c.label, p.x, p.y);
        }
      }

      drawFlightInterface();
      if (starHopActiveRef.current && !reducedMotionRef.current) {
        drawStarHopWarp(now);
      }

      // Edge falloff makes the whole view read as a celestial observatory viewport.
      const vignette = ctx!.createRadialGradient(w * 0.5, h * 0.46, Math.min(w, h) * 0.16, w * 0.5, h * 0.46, Math.max(w, h) * 0.78);
      vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
      vignette.addColorStop(0.68, "rgba(0, 0, 10, 0.02)");
      vignette.addColorStop(1, "rgba(0, 0, 10, 0.38)");
      ctx!.fillStyle = vignette;
      ctx!.fillRect(0, 0, w, h);
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

  const activeTarget = selectedObject || hoveredObject;

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
          cursor: starHopActive ? "crosshair" : isDraggingState ? "grabbing" : "grab",
          touchAction: "none",
        }}
      />

      {/* Floating Interactive Cosmic Object Inspector */}
      {activeTarget && (
        <div
          className="sky-inspector-card"
          style={{
            position: "fixed",
            left: Math.min(
              typeof window !== "undefined" ? window.innerWidth - 250 : 300,
              Math.max(12, activeTarget.x + 16)
            ),
            top: Math.min(
              typeof window !== "undefined" ? window.innerHeight - 140 : 300,
              Math.max(12, activeTarget.y - 45)
            ),
            pointerEvents: selectedObject ? "auto" : "none",
            zIndex: 50,
          }}
        >
          <div className="sky-inspector-header">
            <span className="sky-inspector-badge">{activeTarget.type}</span>
            {selectedObject && (
              <button
                type="button"
                className="sky-inspector-close"
                onClick={() => setSelectedObject(null)}
                aria-label="Close inspector"
              >
                ✕
              </button>
            )}
          </div>
          <div className="sky-inspector-name">{activeTarget.name}</div>
          {activeTarget.designation && (
            <div className="sky-inspector-desig mono">{activeTarget.designation}</div>
          )}
          <div className="sky-inspector-details mono">
            {activeTarget.constellation && (
              <span>in {activeTarget.constellation} · </span>
            )}
            {activeTarget.mag !== undefined && activeTarget.mag !== null && (
              <span>
                {activeTarget.mag > 0
                  ? `+${activeTarget.mag.toFixed(1)}`
                  : activeTarget.mag.toFixed(1)}
                m ·{" "}
              </span>
            )}
            <span>
              Alt {Math.round(activeTarget.alt)}° · Az{" "}
              {Math.round(activeTarget.az)}°
            </span>
          </div>
        </div>
      )}

      <SkyInfoPanel
        birthData={birthData}
        linesVisible={showConstellations}
        constellationNamesVisible={showConstellationNames}
        labelsVisible={showStarLabels}
        dsosVisible={showDSOs}
        milkyWayVisible={showMilkyWay}
        guidesVisible={showGuides}
        onLinesChange={() => setShowConstellations((v) => !v)}
        onConstellationNamesChange={() => setShowConstellationNames((v) => !v)}
        onLabelsChange={() => setShowStarLabels((v) => !v)}
        onDsosChange={() => setShowDSOs((v) => !v)}
        onMilkyWayChange={() => setShowMilkyWay((v) => !v)}
        onGuidesChange={() => setShowGuides((v) => !v)}
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
            {starHopActive
              ? "flight mode · drag to look around · click a bright star to fly"
              : "drag to pan · scroll / pinch to zoom · hover to inspect"}
          </p>
          <div className="night-sky-hud-controls">
            <button
              type="button"
              className={`night-sky-star-hop ${starHopActive ? "is-active" : ""}`}
              onClick={toggleStarHop}
              aria-pressed={starHopActive}
            >
              {starHopActive ? "✦ Exit flight" : "✦ Star flight"}
            </button>
            <div className="night-sky-zoom mono">
              {starHopActive ? "HORIZON CAMERA" : `FOV ${Math.round(fovDeg)}°`}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
