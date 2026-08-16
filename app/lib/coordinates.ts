/* ============================================
   CELESTIA — Coordinate & Rendering Helpers
   ============================================ */

import {
  normalizeDeg,
  localSiderealTime,
  obliquityOfEcliptic,
  atan2d,
  cosd,
  sind,
  tand,
  type GeoLocation,
} from "./astronomy";
import { signFromLongitude, type ZodiacName } from "./zodiac";

// ============================================
// A. RISING SIGN (Ascendant)
// ============================================

/**
 * Compute the Ascendant (rising sign) — the zodiac sign on the eastern
 * horizon at birth. Standard astrological ascendant formula.
 */
export function getRisingSign(
  jd: number,
  location: GeoLocation,
): { longitude: number; sign: ZodiacName } {
  const lst = localSiderealTime(jd, location.lon); // degrees
  const eps = obliquityOfEcliptic(jd);
  const lat = location.lat;

  // Ascendant ecliptic longitude (Meeus / standard formula)
  const asc = normalizeDeg(
    atan2d(cosd(lst), -(sind(lst) * cosd(eps) + tand(lat) * sind(eps))),
  );

  return { longitude: asc, sign: signFromLongitude(asc) };
}

// ============================================
// B. STAR VISUAL MAPPING
// ============================================

/**
 * Map stellar magnitude → render radius in px.
 * Brighter (lower mag) = bigger. Per brief: r = max(1, 4 - mag*0.8).
 */
export function magnitudeToRadius(mag: number): number {
  return Math.max(1, 4 - mag * 0.8);
}

/**
 * Map stellar magnitude → base opacity. Faint stars are dimmer.
 * Clamped so nothing fully disappears or blows out.
 */
export function magnitudeToOpacity(mag: number): number {
  // mag -1.5 → ~1.0, mag +4 → ~0.35
  const o = 1.05 - (mag + 1.5) * 0.12;
  return Math.max(0.3, Math.min(1, o));
}

/**
 * Spectral color approximation. Catalog already provides `color`,
 * but this is a fallback if a star lacks one.
 * O/B blue-white, A white, F yellow-white, G yellow, K orange, M red.
 */
export function spectralColor(spectralType: string): string {
  const c = (spectralType || "A")[0].toUpperCase();
  switch (c) {
    case "O":
      return "#9bb0ff";
    case "B":
      return "#aabfff";
    case "A":
      return "#cad7ff";
    case "F":
      return "#f8f7ff";
    case "G":
      return "#fff4ea";
    case "K":
      return "#ffd2a1";
    case "M":
      return "#ffb56c";
    default:
      return "#ffffff";
  }
}

// ============================================
// C. TWILIGHT SKY COLOR
// ============================================

/**
 * Blend sky colors based on the Sun's altitude.
 * Returns {zenith, mid, horizon} hex-ish rgb strings for the sky gradient.
 * - Sun above 0°: (daytime — we still render night sky, but tint lighter)
 * - Sun -18..0: twilight bands (orange horizon → navy)
 * - Sun below -18: true night (deep blue-black)
 */
export function skyGradientForSunAltitude(sunAlt: number): {
  zenith: string;
  mid: string;
  horizon: string;
} {
  // True night
  if (sunAlt <= -18) {
    return { zenith: "#0a0a1a", mid: "#0d0d24", horizon: "#141428" };
  }

  // Daytime — brighten but keep the app's dark aesthetic (rare for births at noon)
  if (sunAlt >= 0) {
    return { zenith: "#1a2038", mid: "#243050", horizon: "#3a4a72" };
  }

  // Twilight: interpolate 0 → -18
  const t = (0 - sunAlt) / 18; // 0 at sunset, 1 at astronomical night
  const lerp = (a: number, b: number) => Math.round(a + (b - a) * t);
  const rgb = (r: number, g: number, b: number) => `rgb(${r},${g},${b})`;

  // horizon: warm dusk (250,120,60) → deep navy (20,20,40)
  const horizon = rgb(lerp(250, 20), lerp(120, 20), lerp(60, 40));
  // mid: (40,40,90) → (13,13,36)
  const mid = rgb(lerp(60, 13), lerp(50, 13), lerp(110, 36));
  // zenith: (20,25,60) → (10,10,26)
  const zenith = rgb(lerp(20, 10), lerp(25, 10), lerp(60, 26));

  return { zenith, mid, horizon };
}
