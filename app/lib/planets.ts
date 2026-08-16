/* ============================================
   CELESTIA — Planetary Positions (simplified)
   Keplerian elements (J2000) → heliocentric →
   geocentric ecliptic → equatorial. ±1° accuracy.
   ============================================ */

import {
  DEG2RAD,
  normalizeDeg,
  sind,
  cosd,
  atan2d,
  asind,
  daysSinceJ2000,
  eclipticToEquatorial,
  type EquatorialCoord,
} from "./astronomy";

export type PlanetName = "Mercury" | "Venus" | "Mars" | "Jupiter" | "Saturn";

/** Distinct render colors per planet (spec: distinctly colored dots). */
export const PLANET_COLOR: Record<PlanetName, string> = {
  Mercury: "#b0b0b0",
  Venus: "#f5e8c0",
  Mars: "#e06040",
  Jupiter: "#e8c890",
  Saturn: "#d8c078",
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

/** Standard J2000 elements (NASA/JPL approximate). Includes Earth. */
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
};

const PLANETS: PlanetName[] = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn"];

/**
 * Solve Kepler's equation M = E - e·sin(E) for eccentric anomaly E.
 * Newton–Raphson, radians in/out. Converges in a few iterations.
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
 * at the given Julian Date. Returns {x, y, z} in AU.
 */
function heliocentric(
  name: PlanetName | "Earth",
  jd: number,
): {
  x: number;
  y: number;
  z: number;
} {
  const T = daysSinceJ2000(jd) / 36525.0; // Julian centuries
  const el = ELEMENTS[name];

  const a = el.a + el.da * T;
  const e = el.e + el.de * T;
  const I = el.I + el.dI * T;
  const L = normalizeDeg(el.L + el.dL * T);
  const wbar = el.wbar + el.dwbar * T;
  const Omega = el.Omega + el.dOmega * T;

  // Argument of perihelion & mean anomaly
  const w = wbar - Omega;
  let M = normalizeDeg(L - wbar);
  // fold to [-180,180] for Kepler
  if (M > 180) M -= 360;

  const Mrad = M * DEG2RAD;
  const E = solveKepler(Mrad, e); // radians

  // Position in orbital plane
  const xp = a * (Math.cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * Math.sin(E);

  // Rotate into J2000 ecliptic frame
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

  return { x, y, z };
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
}

/**
 * Geocentric equatorial position of a single planet.
 * Subtracts Earth's heliocentric vector, converts to ecliptic lon/lat,
 * then to RA/Dec.
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

  return {
    name,
    color: PLANET_COLOR[name],
    eclipticLon,
    eclipticLat,
    equatorial,
    distanceAU,
  };
}

/** All five visible planets at a given JD. */
export function getAllPlanets(jd: number): PlanetPosition[] {
  return PLANETS.map((name) => getPlanetPosition(name, jd));
}
