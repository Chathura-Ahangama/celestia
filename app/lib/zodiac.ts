/* ============================================
   CELESTIA — Zodiac Determination
   Sign from true solar ecliptic longitude.
   ============================================ */

import { sunEclipticLongitude, normalizeDeg } from "./astronomy";

export type ZodiacName =
  | "Aries"
  | "Taurus"
  | "Gemini"
  | "Cancer"
  | "Leo"
  | "Virgo"
  | "Libra"
  | "Scorpio"
  | "Sagittarius"
  | "Capricorn"
  | "Aquarius"
  | "Pisces";

/** The 12 signs in ecliptic order, starting at 0° = Aries. */
export const ZODIAC_ORDER: ZodiacName[] = [
  "Aries",
  "Taurus",
  "Gemini",
  "Cancer",
  "Leo",
  "Virgo",
  "Libra",
  "Scorpio",
  "Sagittarius",
  "Capricorn",
  "Aquarius",
  "Pisces",
];

/** Unicode glyphs per sign. */
export const ZODIAC_SYMBOL: Record<ZodiacName, string> = {
  Aries: "♈",
  Taurus: "♉",
  Gemini: "♊",
  Cancer: "♋",
  Leo: "♌",
  Virgo: "♍",
  Libra: "♎",
  Scorpio: "♏",
  Sagittarius: "♐",
  Capricorn: "♑",
  Aquarius: "♒",
  Pisces: "♓",
};

/** IAU constellation abbreviation each sign maps to. */
export const ZODIAC_CONSTELLATION: Record<ZodiacName, string> = {
  Aries: "Ari",
  Taurus: "Tau",
  Gemini: "Gem",
  Cancer: "Cnc",
  Leo: "Leo",
  Virgo: "Vir",
  Libra: "Lib",
  Scorpio: "Sco",
  Sagittarius: "Sgr",
  Capricorn: "Cap",
  Aquarius: "Aqr",
  Pisces: "Psc",
};

export interface ZodiacResult {
  sign: ZodiacName;
  symbol: string;
  /** Sun's ecliptic longitude used, degrees. */
  longitude: number;
  /** Degrees into the current sign (0..30). */
  degreesInSign: number;
  /** True if within `cuspDays`-equivalent of a sign boundary. */
  onCusp: boolean;
  /** Adjacent sign if on cusp, else null. */
  cuspWith: ZodiacName | null;
}

/**
 * Determine zodiac sign from a Julian Date using the true solar longitude.
 * Cusp detection: the Sun moves ~0.9856°/day, so a 2-day cusp window ≈ 2°.
 */
export function getZodiac(jd: number, cuspDegrees = 2): ZodiacResult {
  const lon = sunEclipticLongitude(jd);
  const index = Math.floor(lon / 30) % 12;
  const sign = ZODIAC_ORDER[index];
  const degreesInSign = lon - index * 30;

  // Cusp check: near the start (previous sign) or end (next sign) of the 30° band.
  let onCusp = false;
  let cuspWith: ZodiacName | null = null;

  if (degreesInSign <= cuspDegrees) {
    onCusp = true;
    cuspWith = ZODIAC_ORDER[(index + 11) % 12]; // previous sign
  } else if (degreesInSign >= 30 - cuspDegrees) {
    onCusp = true;
    cuspWith = ZODIAC_ORDER[(index + 1) % 12]; // next sign
  }

  return {
    sign,
    symbol: ZODIAC_SYMBOL[sign],
    longitude: lon,
    degreesInSign,
    onCusp,
    cuspWith,
  };
}

/**
 * Which zodiac sign contains an arbitrary ecliptic longitude.
 * Used to report "Moon in Scorpio", "Mars in Leo", etc.
 */
export function signFromLongitude(lonDeg: number): ZodiacName {
  const lon = normalizeDeg(lonDeg);
  const index = Math.floor(lon / 30) % 12;
  return ZODIAC_ORDER[index];
}
