/* ============================================
   CELESTIA — Moon Engine
   Precise lunar position, phase angle, illumination
   & lit-side direction. Based on Meeus Ch. 47.
   ============================================ */

import {
  DEG2RAD,
  RAD2DEG,
  normalizeDeg,
  sind,
  cosd,
  asind,
  atan2d,
  julianCenturies,
  obliquityOfEcliptic,
  sunEclipticLongitude,
  eclipticToEquatorial,
  type EquatorialCoord,
  type EclipticCoord,
} from "./astronomy";

// ---------- TYPES ----------
export type MoonPhaseName =
  | "New Moon"
  | "Waxing Crescent"
  | "First Quarter"
  | "Waxing Gibbous"
  | "Full Moon"
  | "Waning Gibbous"
  | "Last Quarter"
  | "Waning Crescent";

export interface MoonInfo {
  /** Ecliptic coordinates of the Moon (degrees). */
  ecliptic: EclipticCoord;
  /** Equatorial coordinates (RA/Dec, degrees). */
  equatorial: EquatorialCoord;
  /** Distance to Moon in km. */
  distanceKm: number;
  /** Phase angle i (Sun–Moon–Earth), degrees [0,180]. 0=full, 180=new. */
  phaseAngle: number;
  /** Illuminated fraction k, 0..1. */
  illumination: number;
  /** Age in days since previous new moon (0..~29.53). */
  age: number;
  /** Human-readable phase name. */
  phaseName: MoonPhaseName;
  /** True while waxing (illumination increasing). */
  waxing: boolean;
  /**
   * Position angle of the bright limb (degrees). Direction the lit side
   * faces, measured from celestial North through East.
   */
  brightLimbAngle: number;
}

// ============================================
// A. MOON ECLIPTIC POSITION (Meeus 47)
// ============================================

/**
 * Compute the Moon's geocentric ecliptic longitude, latitude (degrees)
 * and distance (km) using the principal periodic terms of Meeus' theory.
 * Accuracy ~ 10 arcmin in longitude — plenty for a naked-eye sky.
 */
export function moonEcliptic(jd: number): {
  lon: number;
  lat: number;
  distanceKm: number;
} {
  const T = julianCenturies(jd);
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;

  // Moon's mean longitude
  let Lp =
    218.3164477 +
    481267.88123421 * T -
    0.0015786 * T2 +
    T3 / 538841 -
    T4 / 65194000;

  // Mean elongation of the Moon
  let D =
    297.8501921 +
    445267.1114034 * T -
    0.0018819 * T2 +
    T3 / 545868 -
    T4 / 113065000;

  // Sun's mean anomaly
  let M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000;

  // Moon's mean anomaly
  let Mp =
    134.9633964 +
    477198.8675055 * T +
    0.0087414 * T2 +
    T3 / 69699 -
    T4 / 14712000;

  // Moon's argument of latitude
  let F =
    93.272095 +
    483202.0175233 * T -
    0.0036539 * T2 -
    T3 / 3526000 +
    T4 / 863310000;

  // Additional arguments
  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.29 * T;
  const A3 = 313.45 + 481266.484 * T;

  // Eccentricity correction of Earth's orbit
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const E2 = E * E;

  Lp = normalizeDeg(Lp);
  D = normalizeDeg(D);
  M = normalizeDeg(M);
  Mp = normalizeDeg(Mp);
  F = normalizeDeg(F);

  // ---- Periodic terms for longitude (Σl) and distance (Σr) ----
  // Table 47.A (arguments: D, M, Mp, F ; coeff of sin for Σl, cos for Σr)
  // We include the principal 30+ terms for good accuracy.
  const terms = [
    // D, M, Mp, F, Σl(sin, 1e-6 deg), Σr(cos, 1e-3 km)
    [0, 0, 1, 0, 6288774, -20905355],
    [2, 0, -1, 0, 1274027, -3699111],
    [2, 0, 0, 0, 658314, -2955968],
    [0, 0, 2, 0, 213618, -569925],
    [0, 1, 0, 0, -185116, 48888],
    [0, 0, 0, 2, -114332, -3149],
    [2, 0, -2, 0, 58793, 246158],
    [2, -1, -1, 0, 57066, -152138],
    [2, 0, 1, 0, 53322, -170733],
    [2, -1, 0, 0, 45758, -204586],
    [0, 1, -1, 0, -40923, -129620],
    [1, 0, 0, 0, -34720, 108743],
    [0, 1, 1, 0, -30383, 104755],
    [2, 0, 0, -2, 15327, 10321],
    [0, 0, 1, 2, -12528, 0],
    [0, 0, 1, -2, 10980, 79661],
    [4, 0, -1, 0, 10675, -34782],
    [0, 0, 3, 0, 10034, -23210],
    [4, 0, -2, 0, 8548, -21636],
    [2, 1, -1, 0, -7888, 24208],
    [2, 1, 0, 0, -6766, 30824],
    [1, 0, -1, 0, -5163, -8379],
    [1, 1, 0, 0, 4987, -16675],
    [2, -1, 1, 0, 4036, -12831],
    [2, 0, 2, 0, 3994, -10445],
    [4, 0, 0, 0, 3861, -11650],
    [2, 0, -3, 0, 3665, 14403],
    [0, 1, -2, 0, -2689, -7003],
    [2, 0, -1, 2, -2602, 0],
    [2, -1, -2, 0, 2390, 10056],
    [1, 0, 1, 0, -2348, 6322],
    [2, -2, 0, 0, 2236, -9884],
    [0, 1, 2, 0, -2120, 5751],
    [0, 2, 0, 0, -2069, 0],
    [2, -2, -1, 0, 2048, -4950],
    [2, 0, 1, -2, -1773, 4130],
    [2, 0, 0, 2, -1595, 0],
    [4, -1, -1, 0, 1215, -3958],
    [0, 0, 2, 2, -1110, 0],
    [3, 0, -1, 0, -892, 3258],
    [2, 1, 1, 0, -810, 2616],
    [4, -1, -2, 0, 759, -1897],
    [0, 2, -1, 0, -713, -2117],
    [2, 2, -1, 0, -700, 2354],
    [2, 1, -2, 0, 691, 0],
    [2, -1, 0, -2, 596, 0],
    [4, 0, 1, 0, 549, -1423],
    [0, 0, 4, 0, 537, -1117],
    [4, -1, 0, 0, 520, -1571],
    [1, 0, -2, 0, -487, -1739],
    [2, 1, 0, -2, -399, 0],
    [0, 0, 2, -2, -381, -4421],
    [1, 1, 1, 0, 351, 0],
    [3, 0, -2, 0, -340, 0],
    [4, 0, -3, 0, 330, 0],
    [2, -1, 2, 0, 327, 0],
    [0, 2, 1, 0, -323, 1165],
    [1, 1, -1, 0, 299, 0],
    [2, 0, 3, 0, 294, 0],
  ];

  // Latitude terms (Table 47.B; argument coeffs + Σb sin coeff, 1e-6 deg)
  const latTerms = [
    [0, 0, 0, 1, 5128122],
    [0, 0, 1, 1, 280602],
    [0, 0, 1, -1, 277693],
    [2, 0, 0, -1, 173237],
    [2, 0, -1, 1, 55413],
    [2, 0, -1, -1, 46271],
    [2, 0, 0, 1, 32573],
    [0, 0, 2, 1, 17198],
    [2, 0, 1, -1, 9266],
    [0, 0, 2, -1, 8822],
    [2, -1, 0, -1, 8216],
    [2, 0, -2, -1, 4324],
    [2, 0, 1, 1, 4200],
    [2, 1, 0, -1, -3359],
    [2, -1, -1, 1, 2463],
    [2, -1, 0, 1, 2211],
    [2, -1, -1, -1, 2065],
    [0, 1, -1, -1, -1870],
    [4, 0, -1, -1, 1828],
    [0, 1, 0, 1, -1794],
    [0, 0, 0, 3, -1749],
    [0, 1, -1, 1, -1565],
    [1, 0, 0, 1, -1491],
    [0, 1, 1, 1, -1475],
    [0, 1, 1, -1, -1410],
    [0, 1, 0, -1, -1344],
    [1, 0, 0, -1, -1335],
    [0, 0, 3, 1, 1107],
    [4, 0, 0, -1, 1021],
    [4, 0, -1, 1, 833],
    [0, 0, 1, -3, 777],
    [4, 0, -2, 1, 671],
    [2, 0, 0, -3, 607],
    [2, 0, 2, -1, 596],
    [2, -1, 1, -1, 491],
    [2, 0, -2, 1, -451],
    [0, 0, 3, -1, 439],
    [2, 0, 2, 1, 422],
    [2, 0, -3, -1, 421],
  ];

  let sumL = 0;
  let sumR = 0;
  for (const [cD, cM, cMp, cF, sl, sr] of terms) {
    const arg = cD * D + cM * M + cMp * Mp + cF * F;
    // apply eccentricity power for terms involving M
    let ecc = 1;
    if (Math.abs(cM) === 1) ecc = E;
    else if (Math.abs(cM) === 2) ecc = E2;
    sumL += sl * ecc * sind(arg);
    sumR += sr * ecc * cosd(arg);
  }
  let sumB = 0;
  for (const [cD, cM, cMp, cF, sb] of latTerms) {
    const arg = cD * D + cM * M + cMp * Mp + cF * F;
    let ecc = 1;
    if (Math.abs(cM) === 1) ecc = E;
    else if (Math.abs(cM) === 2) ecc = E2;
    sumB += sb * ecc * sind(arg);
  }

  // ---- Additive corrections (Meeus 47) ----
  sumL += 3958 * sind(A1);
  sumL += 1962 * sind(Lp - F);
  sumL += 318 * sind(A2);

  sumB += -2235 * sind(Lp);
  sumB += 382 * sind(A3);
  sumB += 175 * sind(A1 - F);
  sumB += 175 * sind(A1 + F);
  sumB += 127 * sind(Lp - Mp);
  sumB += -115 * sind(Lp + Mp);

  // ---- Final ecliptic coordinates ----
  const lon = normalizeDeg(Lp + sumL / 1_000_000); // degrees
  const lat = sumB / 1_000_000; // degrees
  const distanceKm = 385000.56 + sumR / 1000; // km

  return { lon, lat, distanceKm };
}

// ============================================
// B. FULL MOON INFO (position + phase + illumination)
// ============================================

/**
 * Compute everything we need about the Moon at a given JD.
 * This is the single function the renderer & info panel will call.
 */
export function getMoonInfo(jd: number): MoonInfo {
  const { lon, lat, distanceKm } = moonEcliptic(jd);

  // Equatorial coordinates (RA/Dec)
  const equatorial = eclipticToEquatorial({ lon, lat }, jd);

  // Sun's ecliptic longitude (Sun's latitude ~ 0)
  const sunLon = sunEclipticLongitude(jd);

  // ---- Phase angle i (Sun–Moon–Earth) ----
  // Elongation of the Moon from the Sun (geocentric):
  // cos(elong) = cos(β_moon) * cos(λ_moon - λ_sun)
  const elong = acosd_(cosd(lat) * cosd(lon - sunLon));

  // Phase angle from Meeus 48.3 (approx): tan i uses Sun distance.
  // Sun distance in km (approx 1 AU); Moon distance in km.
  const sunDistKm = 149_597_870.7; // 1 AU
  const i = atan2d(
    sunDistKm * sind(elong),
    distanceKm - sunDistKm * cosd(elong),
  );
  const phaseAngle = normalizeAngle180(i);

  // ---- Illuminated fraction k = (1 + cos i) / 2 ----
  const illumination = (1 + cosd(phaseAngle)) / 2;

  // ---- Waxing vs waning ----
  // Elongation east of the Sun (0..360) tells us the cycle position.
  // If Moon longitude is "ahead" of the Sun (0..180 east) → waxing.
  const eastElong = normalizeDeg(lon - sunLon);
  const waxing = eastElong < 180;

  // ---- Age in days (0 = new moon) ----
  // eastElong / 360 * synodic month
  const SYNODIC_MONTH = 29.530588853;
  const age = (eastElong / 360) * SYNODIC_MONTH;

  // ---- Phase name from age / eastElong ----
  const phaseName = phaseNameFromElongation(eastElong);

  // ---- Position angle of bright limb (Meeus 48.5) ----
  // χ = atan2( cosδ_sun * sin(α_sun - α_moon),
  //            sinδ_sun cosδ_moon - cosδ_sun sinδ_moon cos(α_sun - α_moon) )
  const sunEq = eclipticToEquatorial({ lon: sunLon, lat: 0 }, jd);
  const dAlpha = sunEq.ra - equatorial.ra;
  const brightLimbAngle = normalizeDeg(
    atan2d(
      cosd(sunEq.dec) * sind(dAlpha),
      sind(sunEq.dec) * cosd(equatorial.dec) -
        cosd(sunEq.dec) * sind(equatorial.dec) * cosd(dAlpha),
    ),
  );

  return {
    ecliptic: { lon, lat },
    equatorial,
    distanceKm,
    phaseAngle,
    illumination,
    age,
    phaseName,
    waxing,
    brightLimbAngle,
  };
}

// ============================================
// C. HELPERS
// ============================================

/** acos in degrees with clamping to avoid NaN from float error. */
function acosd_(x: number): number {
  return Math.acos(Math.max(-1, Math.min(1, x))) * RAD2DEG;
}

/** Fold an angle into [0,180] (phase angle magnitude). */
function normalizeAngle180(deg: number): number {
  let d = Math.abs(normalizeDeg(deg));
  if (d > 180) d = 360 - d;
  return d;
}

/**
 * Map the Moon's eastward elongation from the Sun (0..360°) to a phase name.
 * 0/360 = new, 90 = first quarter, 180 = full, 270 = last quarter.
 * Uses ±22.5° windows around the four cardinal phases; everything else
 * is crescent/gibbous.
 */
export function phaseNameFromElongation(eastElong: number): MoonPhaseName {
  const e = normalizeDeg(eastElong);
  if (e < 22.5 || e >= 337.5) return "New Moon";
  if (e < 67.5) return "Waxing Crescent";
  if (e < 112.5) return "First Quarter";
  if (e < 157.5) return "Waxing Gibbous";
  if (e < 202.5) return "Full Moon";
  if (e < 247.5) return "Waning Gibbous";
  if (e < 292.5) return "Last Quarter";
  return "Waning Crescent";
}

/**
 * Convenience: determine whether the lit side is on the LEFT or RIGHT
 * as seen by a Northern-Hemisphere observer facing the Moon.
 * (Waxing → right lit ; Waning → left lit. Flipped for Southern Hemisphere.)
 */
export function litSide(
  waxing: boolean,
  observerLat: number,
): "left" | "right" {
  const northern = observerLat >= 0;
  if (waxing) return northern ? "right" : "left";
  return northern ? "left" : "right";
}

// ============================================
// D. SELF-TEST (dev only)
// ============================================

/**
 * Sanity check against Apollo 11 (1969-07-20 20:17 UTC).
 * Expected: Waxing Crescent, illumination ~0.35 (day ~6 of cycle).
 */
export function __moonSelfTest(toJulianDate: (d: unknown) => number) {
  const jd = toJulianDate({
    year: 1969,
    month: 7,
    day: 20,
    hour: 20,
    minute: 17,
  });
  const info = getMoonInfo(jd);
  return {
    phaseName: info.phaseName,
    illuminationPct: (info.illumination * 100).toFixed(1) + "%",
    ageDays: info.age.toFixed(2),
    waxing: info.waxing,
    expected: "Waxing Crescent, ~30-40%, age ~6d",
  };
}
