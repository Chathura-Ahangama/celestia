/* ============================================
   CELESTIA — Planetary Positions & Solar System
   Keplerian orbital elements (J2000) → heliocentric →
   geocentric ecliptic → equatorial. Complete 8-planet
   system + Pluto with apparent visual magnitude.
   ============================================ */

import {
  DEG2RAD,
  RAD2DEG,
  normalizeDeg,
  sind,
  cosd,
  atan2d,
  asind,
  daysSinceJ2000,
  eclipticToEquatorial,
  type EquatorialCoord,
} from "./astronomy";
import meteorShowersData from "../data/meteorShowers.json";

export type PlanetName =
  | "Mercury"
  | "Venus"
  | "Mars"
  | "Jupiter"
  | "Saturn"
  | "Uranus"
  | "Neptune"
  | "Pluto";

/** Distinct render colors per planet */
export const PLANET_COLOR: Record<PlanetName, string> = {
  Mercury: "#b5b5b5",
  Venus: "#f7ecc8",
  Mars: "#e06040",
  Jupiter: "#e8c890",
  Saturn: "#dfc688",
  Uranus: "#8ce0e8",
  Neptune: "#5a88e8",
  Pluto: "#c4a896",
};

/** Keplerian orbital elements at J2000 + rates per Julian century. */
interface Elements {
  a: number;
  da: number; // semi-major axis (AU)
  e: number;
  de: number; // eccentricity
  I: number;
  dI: number; // inclination (deg)
  L: number;
  dL: number; // mean longitude (deg)
  wbar: number;
  dwbar: number; // longitude of perihelion (deg)
  Omega: number;
  dOmega: number; // longitude of ascending node (deg)
}

/** Standard J2000 elements (NASA/JPL approximate). */
const ELEMENTS: Record<PlanetName | "Earth", Elements> = {
  Mercury: {
    a: 0.38709927,
    da: 0.00000037,
    e: 0.20563593,
    de: 0.00001906,
    I: 7.00497902,
    dI: -0.00594749,
    L: 252.2503235,
    dL: 149472.67411175,
    wbar: 77.45779628,
    dwbar: 0.16047689,
    Omega: 48.33076593,
    dOmega: -0.12534081,
  },
  Venus: {
    a: 0.72333566,
    da: 0.0000039,
    e: 0.00677672,
    de: -0.00004107,
    I: 3.39467605,
    dI: -0.0007889,
    L: 181.9790995,
    dL: 58517.81538729,
    wbar: 131.60246718,
    dwbar: 0.00268329,
    Omega: 76.67984255,
    dOmega: -0.27769418,
  },
  Earth: {
    a: 1.00000261,
    da: 0.00000562,
    e: 0.01671123,
    de: -0.00004392,
    I: -0.00001531,
    dI: -0.01294668,
    L: 100.46457166,
    dL: 35999.37244981,
    wbar: 102.93768193,
    dwbar: 0.32327364,
    Omega: 0.0,
    dOmega: 0.0,
  },
  Mars: {
    a: 1.52371034,
    da: 0.00001847,
    e: 0.0933941,
    de: 0.00007882,
    I: 1.84969142,
    dI: -0.00813131,
    L: -4.55343205,
    dL: 19140.30268499,
    wbar: -23.94362959,
    dwbar: 0.44441088,
    Omega: 49.55953891,
    dOmega: -0.29257343,
  },
  Jupiter: {
    a: 5.202887,
    da: -0.00011607,
    e: 0.04838624,
    de: -0.00013253,
    I: 1.30439695,
    dI: -0.00183714,
    L: 34.39644051,
    dL: 3034.74612775,
    wbar: 14.72847983,
    dwbar: 0.21252668,
    Omega: 100.47390909,
    dOmega: 0.20469106,
  },
  Saturn: {
    a: 9.53667594,
    da: -0.0012506,
    e: 0.05386179,
    de: -0.00050991,
    I: 2.48599187,
    dI: 0.00193609,
    L: 49.95424423,
    dL: 1222.49362201,
    wbar: 92.59887831,
    dwbar: -0.41897216,
    Omega: 113.66242448,
    dOmega: -0.28867794,
  },
  Uranus: {
    a: 19.18916464,
    da: -0.00196176,
    e: 0.04725744,
    de: -0.00004397,
    I: 0.77263783,
    dI: -0.00180155,
    L: 314.05500511,
    dL: 429.8640561,
    wbar: 170.9542763,
    dwbar: 0.40805281,
    Omega: 74.01692503,
    dOmega: 0.05234614,
  },
  Neptune: {
    a: 30.06992276,
    da: 0.00026291,
    e: 0.00860619,
    de: 0.0000215,
    I: 1.77004347,
    dI: 0.000224,
    L: 304.348665,
    dL: 219.8833092,
    wbar: 46.727364,
    dwbar: -0.112422,
    Omega: 131.78422574,
    dOmega: -0.006165,
  },
  Pluto: {
    a: 39.48211675,
    da: -0.00031596,
    e: 0.2488273,
    de: 0.0000517,
    I: 17.14001206,
    dI: 0.00004818,
    L: 238.92903833,
    dL: 145.20780515,
    wbar: 224.06876,
    dwbar: -0.040629,
    Omega: 110.3039368,
    dOmega: -0.008099,
  },
};

export const VISIBLE_PLANETS: PlanetName[] = [
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
];

export const ALL_PLANET_NAMES: PlanetName[] = [
  "Mercury",
  "Venus",
  "Mars",
  "Jupiter",
  "Saturn",
  "Uranus",
  "Neptune",
  "Pluto",
];

/**
 * Solve Kepler's equation M = E - e·sin(E) for eccentric anomaly E.
 * Newton–Raphson, radians in/out.
 */
function solveKepler(M: number, e: number): number {
  let E = M + e * Math.sin(M);
  for (let i = 0; i < 8; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-8) break;
  }
  return E;
}

/**
 * Compute a planet's heliocentric ecliptic rectangular coords (J2000 frame)
 * at the given Julian Date. Returns {x, y, z, r} in AU.
 */
function heliocentric(
  name: PlanetName | "Earth",
  jd: number,
): {
  x: number;
  y: number;
  z: number;
  r: number;
} {
  const T = daysSinceJ2000(jd) / 36525.0; // Julian centuries
  const el = ELEMENTS[name];

  const a = el.a + el.da * T;
  const e = el.e + el.de * T;
  const I = el.I + el.dI * T;
  const L = normalizeDeg(el.L + el.dL * T);
  const wbar = el.wbar + el.dwbar * T;
  const Omega = el.Omega + el.dOmega * T;

  const w = wbar - Omega;
  let M = normalizeDeg(L - wbar);
  if (M > 180) M -= 360;

  const Mrad = M * DEG2RAD;
  const E = solveKepler(Mrad, e);

  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);

  const cosw = cosd(w),
    sinw = sind(w);
  const cosO = cosd(Omega),
    sinO = sind(Omega);
  const cosI = cosd(I),
    sinI = sind(I);

  const x =
    (cosw * cosO - sinw * sinO * cosI) * xp +
    (-sinw * cosO - cosw * sinO * cosI) * yp;
  const y =
    (cosw * sinO + sinw * cosO * cosI) * xp +
    (-sinw * sinO + cosw * cosO * cosI) * yp;
  const z = sinw * sinI * xp + cosw * sinI * yp;

  const r = Math.sqrt(x * x + y * y + z * z);
  return { x, y, z, r };
}

/**
 * Calculate visual apparent magnitude of a planet (Meeus standard formulae).
 */
export function calculatePlanetMagnitude(
  name: PlanetName,
  r: number,
  delta: number,
  rEarth: number,
): number {
  // Phase angle i (angle Sun-Planet-Earth)
  const cosI = (r * r + delta * delta - rEarth * rEarth) / (2 * r * delta);
  const iDeg = Math.acos(Math.max(-1, Math.min(1, cosI))) * RAD2DEG;
  const logTerm = 5 * Math.log10(Math.max(0.01, r * delta));

  switch (name) {
    case "Mercury":
      return -0.42 + logTerm + 0.038 * iDeg - 0.000273 * iDeg * iDeg + 0.000002 * Math.pow(iDeg, 3);
    case "Venus":
      return -4.4 + logTerm + 0.0009 * iDeg + 0.000239 * iDeg * iDeg - 0.00000065 * Math.pow(iDeg, 3);
    case "Mars":
      return -1.52 + logTerm + 0.016 * iDeg;
    case "Jupiter":
      return -9.4 + logTerm + 0.005 * iDeg;
    case "Saturn":
      return -8.88 + logTerm + 0.044 * iDeg;
    case "Uranus":
      return -7.19 + logTerm;
    case "Neptune":
      return -6.87 + logTerm;
    case "Pluto":
      return -1.0 + logTerm + 0.04 * iDeg;
    default:
      return 0.0;
  }
}

export interface PlanetPosition {
  name: PlanetName;
  color: string;
  /** Geocentric ecliptic longitude (deg) — for "Mars in Leo" etc. */
  eclipticLon: number;
  eclipticLat: number;
  /** Equatorial RA/Dec (deg) — for rendering. */
  equatorial: EquatorialCoord;
  /** Distance from Earth in AU. */
  distanceAU: number;
  /** Distance from Sun in AU. */
  distanceSunAU: number;
  /** Apparent visual magnitude. */
  mag: number;
}

/**
 * Geocentric equatorial position of a single planet.
 */
export function getPlanetPosition(
  name: PlanetName,
  jd: number,
): PlanetPosition {
  const p = heliocentric(name, jd);
  const earth = heliocentric("Earth", jd);

  // Geocentric ecliptic rectangular
  const gx = p.x - earth.x;
  const gy = p.y - earth.y;
  const gz = p.z - earth.z;

  const distanceAU = Math.sqrt(gx * gx + gy * gy + gz * gz);
  const eclipticLon = normalizeDeg(atan2d(gy, gx));
  const eclipticLat = asind(gz / distanceAU);

  const equatorial = eclipticToEquatorial(
    { lon: eclipticLon, lat: eclipticLat },
    jd,
  );

  const mag = calculatePlanetMagnitude(name, p.r, distanceAU, earth.r);

  return {
    name,
    color: PLANET_COLOR[name],
    eclipticLon,
    eclipticLat,
    equatorial,
    distanceAU,
    distanceSunAU: p.r,
    mag: Math.round(mag * 10) / 10,
  };
}

/** All visible planets at a given JD. */
export function getAllPlanets(jd: number): PlanetPosition[] {
  return VISIBLE_PLANETS.map((name) => getPlanetPosition(name, jd));
}

export interface MeteorShower {
  id: string;
  name: string;
  peakMonth: number;
  peakDay: number;
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
  radiant: EquatorialCoord;
  constellation: string;
  zhr: number;
  velocity: number;
  parent: string;
  description: string;
  /** Activity status at birth date */
  isPeak: boolean;
  daysFromPeak: number;
}

/**
 * Check which major meteor showers are active for a given birth calendar date.
 */
export function getActiveMeteorShowers(
  month: number,
  day: number,
): MeteorShower[] {
  const active: MeteorShower[] = [];
  const birthDayOfYear = getDayOfYear(month, day);

  for (const shower of meteorShowersData) {
    const startDOY = getDayOfYear(shower.startMonth, shower.startDay);
    const endDOY = getDayOfYear(shower.endMonth, shower.endDay);
    const peakDOY = getDayOfYear(shower.peakMonth, shower.peakDay);

    let isActive = false;
    if (startDOY <= endDOY) {
      isActive = birthDayOfYear >= startDOY && birthDayOfYear <= endDOY;
    } else {
      // wraps around Dec/Jan (like Quadrantids)
      isActive = birthDayOfYear >= startDOY || birthDayOfYear <= endDOY;
    }

    if (isActive) {
      let diff = Math.abs(birthDayOfYear - peakDOY);
      if (diff > 180) diff = 365 - diff;
      active.push({
        ...shower,
        isPeak: diff <= 2,
        daysFromPeak: diff,
      });
    }
  }

  active.sort((a, b) => a.daysFromPeak - b.daysFromPeak);
  return active;
}

function getDayOfYear(month: number, day: number): number {
  const daysInMonth = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let doy = 0;
  for (let m = 1; m < month; m++) {
    doy += daysInMonth[m];
  }
  return doy + day;
}
