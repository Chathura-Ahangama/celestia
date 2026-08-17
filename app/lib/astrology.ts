/* ============================================
   CELESTIA — Comprehensive Vedic & Astronomical Astrology Engine
   - Precise Lahiri (Chitrapaksha) Ayanamsa
   - Sidereal (Nirayana / Vedic) & Tropical (Sayana) coordinate systems
   - Ascendant (Lagna) & Midheaven (MC)
   - Mean Lunar Nodes (Rahu / Ketu)
   - 12 Bhavas (Houses) with Bhava Madhya (House Midpoints / Sripati)
   - Vedic Dignities (Uchcha, Neecha, Swakshetra, Mitra, Sathuru, Sama)
   - Retrograde (Vakra) motion detection
   ============================================ */

import {
  DEG2RAD,
  RAD2DEG,
  normalizeDeg,
  sind,
  cosd,
  atan2d,
  type GeoLocation,
  localToUTC,
  toJulianDate,
  equatorialToHorizontal,
  precessFromJ2000,
  sunEclipticLongitude,
  sunEquatorial,
} from "./astronomy";
import { getMoonInfo } from "./moonPhase";
import { getAllPlanets, type PlanetPosition, type PlanetName } from "./planets";
import type { BirthData } from "../page";

export type ZodiacSystem = "sidereal" | "tropical";

export interface ZodiacSignInfo {
  index: number;
  english: string;
  sanskrit: string;
  symbol: string;
  element: "fire" | "earth" | "air" | "water";
  ruler: string;
}

export const ZODIAC_SIGNS: ZodiacSignInfo[] = [
  { index: 0, english: "Aries", sanskrit: "Mesha", symbol: "♈", element: "fire", ruler: "Mars" },
  { index: 1, english: "Taurus", sanskrit: "Vrishabha", symbol: "♉", element: "earth", ruler: "Venus" },
  { index: 2, english: "Gemini", sanskrit: "Mithuna", symbol: "♊", element: "air", ruler: "Mercury" },
  { index: 3, english: "Cancer", sanskrit: "Kataka", symbol: "♋", element: "water", ruler: "Moon" },
  { index: 4, english: "Leo", sanskrit: "Simha", symbol: "♌", element: "fire", ruler: "Sun" },
  { index: 5, english: "Virgo", sanskrit: "Kanya", symbol: "♍", element: "earth", ruler: "Mercury" },
  { index: 6, english: "Libra", sanskrit: "Thula", symbol: "♎", element: "air", ruler: "Venus" },
  { index: 7, english: "Scorpio", sanskrit: "Vrischika", symbol: "♏", element: "water", ruler: "Mars" },
  { index: 8, english: "Sagittarius", sanskrit: "Dhanu", symbol: "♐", element: "fire", ruler: "Jupiter" },
  { index: 9, english: "Capricorn", sanskrit: "Makara", symbol: "♑", element: "earth", ruler: "Saturn" },
  { index: 10, english: "Aquarius", sanskrit: "Kumbha", symbol: "♒", element: "air", ruler: "Saturn" },
  { index: 11, english: "Pisces", sanskrit: "Meena", symbol: "♓", element: "water", ruler: "Jupiter" },
];

/**
 * Calculates standard Chitrapaksha / Lahiri Ayanamsa for the given Julian Date.
 * Baseline at J2000.0: 23° 51' 25.53" = 23.85709167°
 * Rate of precession: 50.290966" per Julian year.
 */
export function getLahiriAyanamsa(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0; // Julian centuries from J2000
  return 23.85709167 + (T * 100.0) * (50.290966 / 3600.0);
}

/**
 * Converts ecliptic longitude into Sign + Degree in sign.
 */
export function getSignFromLongitude(longitudeDeg: number): {
  sign: ZodiacSignInfo;
  degInSign: number;
  formatted: string;
} {
  const norm = normalizeDeg(longitudeDeg);
  const signIndex = Math.floor(norm / 30) % 12;
  const degInSign = norm % 30;
  const d = Math.floor(degInSign);
  const m = Math.floor((degInSign % 1) * 60);
  const s = Math.floor(((degInSign % 1) * 60 % 1) * 60);

  const sign = ZODIAC_SIGNS[signIndex];
  const formatted = `${String(d).padStart(2, "0")}° ${String(m).padStart(2, "0")}' ${sign.sanskrit} (${sign.english})`;

  return { sign, degInSign, formatted };
}

/**
 * Computes Ascendant (Lagna) and Midheaven (MC).
 */
export function getAscendantAndMC(
  jd: number,
  location: GeoLocation
): {
  tropicalAsc: number;
  siderealAsc: number;
  tropicalMC: number;
  siderealMC: number;
  ayanamsa: number;
  lagnaSign: ZodiacSignInfo;
  lagnaDegInSign: number;
  lagnaFormatted: string;
} {
  const T = (jd - 2451545.0) / 36525.0;
  const ayanamsa = getLahiriAyanamsa(jd);

  // Greenwich Mean Sidereal Time (degrees)
  const gmst = normalizeDeg(
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0
  );

  // Local Mean Sidereal Time (RAMC in degrees)
  const lmst = normalizeDeg(gmst + location.lon);
  const eps = 23.4392911 - 0.0130042 * T;

  // Ascendant formula (intersection of horizon and ecliptic in the East)
  const yAsc = cosd(lmst);
  const xAsc = -(sind(lmst) * cosd(eps) + Math.tan(location.lat * DEG2RAD) * sind(eps));
  const tropicalAsc = normalizeDeg(atan2d(yAsc, xAsc));
  const siderealAsc = normalizeDeg(tropicalAsc - ayanamsa);

  // Midheaven (MC) formula
  const yMC = sind(lmst);
  const xMC = cosd(lmst) * cosd(eps);
  const tropicalMC = normalizeDeg(atan2d(yMC, xMC));
  const siderealMC = normalizeDeg(tropicalMC - ayanamsa);

  const lagnaInfo = getSignFromLongitude(siderealAsc);

  return {
    tropicalAsc,
    siderealAsc,
    tropicalMC,
    siderealMC,
    ayanamsa,
    lagnaSign: lagnaInfo.sign,
    lagnaDegInSign: lagnaInfo.degInSign,
    lagnaFormatted: lagnaInfo.formatted,
  };
}

/**
 * Computes mean lunar nodes (Rahu and Ketu) using Meeus lunar theory.
 */
export function getLunarNodes(
  jd: number,
  ayanamsa: number
): {
  rahuTropical: number;
  rahuSidereal: number;
  ketuTropical: number;
  ketuSidereal: number;
} {
  const T = (jd - 2451545.0) / 36525.0;
  // Mean longitude of ascending node (Omega)
  const rahuTropical = normalizeDeg(
    125.04452 - 1934.136261 * T + 0.0020708 * T * T + (T * T * T) / 450000.0
  );
  const rahuSidereal = normalizeDeg(rahuTropical - ayanamsa);
  const ketuTropical = normalizeDeg(rahuTropical + 180.0);
  const ketuSidereal = normalizeDeg(rahuSidereal + 180.0);

  return {
    rahuTropical,
    rahuSidereal,
    ketuTropical,
    ketuSidereal,
  };
}

/**
 * Calculates Bhava Madhya (House Midpoints / Equal House from Lagna).
 * In Bhava Madhya system, House 1 center is Lagna.
 * Each house spans 30° with its midpoint at Lagna + (House - 1) * 30°.
 */
export function getBhavaHouse(
  planetSiderealLon: number,
  ascendantSiderealLon: number
): {
  houseNumber: number;
  houseName: string;
  midpointLon: number;
  spanStartLon: number;
  spanEndLon: number;
} {
  // Angle difference from Lagna
  const diffFromLagna = normalizeDeg(planetSiderealLon - ascendantSiderealLon);
  // Shift by 15° so House 1 is centered at Lagna (i.e. [-15°, +15°] from Lagna)
  const houseIndex = Math.floor(normalizeDeg(diffFromLagna + 15.0) / 30.0) % 12;
  const houseNumber = houseIndex + 1;

  const midpointLon = normalizeDeg(ascendantSiderealLon + houseIndex * 30.0);
  const spanStartLon = normalizeDeg(midpointLon - 15.0);
  const spanEndLon = normalizeDeg(midpointLon + 15.0);

  const houseNames = [
    "1st House (Lagna / Tanu Bhava)",
    "2nd House (Dhana Bhava)",
    "3rd House (Bhatru Bhava)",
    "4th House (Matru / Sukha Bhava)",
    "5th House (Putra Bhava)",
    "6th House (Shatru / Roga Bhava)",
    "7th House (Kalatra Bhava)",
    "8th House (Ayur / Randhra Bhava)",
    "9th House (Bhagya / Dharma Bhava)",
    "10th House (Karma Bhava)",
    "11th House (Labha Bhava)",
    "12th House (Vyaya Bhava)",
  ];

  return {
    houseNumber,
    houseName: houseNames[houseIndex],
    midpointLon,
    spanStartLon,
    spanEndLon,
  };
}

/**
 * Evaluates Vedic Dignity / State (Avastha) of a celestial body in its sidereal sign.
 */
export function getVedicDignity(
  planetName: string,
  siderealLon: number
): {
  dignity: string;
  sanskritDignity: string;
  label: string;
} {
  const signIdx = Math.floor(normalizeDeg(siderealLon) / 30) % 12;

  // Dignity maps: sign indices 0=Mesha, 1=Vrishabha, 2=Mithuna, 3=Kataka, 4=Simha, 5=Kanya, 6=Thula, 7=Vrischika, 8=Dhanu, 9=Makara, 10=Kumbha, 11=Meena
  switch (planetName) {
    case "Sun":
      if (signIdx === 0) return { dignity: "Exalted", sanskritDignity: "Uchcha", label: "Uchcha (Exalted)" };
      if (signIdx === 6) return { dignity: "Debilitated (Neecha Bhanga)", sanskritDignity: "Neecha Bhanga", label: "Neecha Bhanga" };
      if (signIdx === 4) return { dignity: "Own Sign", sanskritDignity: "Swakshetra", label: "Swakshetra" };
      if ([8, 11, 0, 7].includes(signIdx)) return { dignity: "Friend", sanskritDignity: "Mitra", label: "Mitra" };
      return { dignity: "Neutral", sanskritDignity: "Sama", label: "Sama" };

    case "Moon":
      if (signIdx === 1) return { dignity: "Exalted", sanskritDignity: "Uchcha", label: "Uchcha (Exalted)" };
      if (signIdx === 7) return { dignity: "Debilitated", sanskritDignity: "Neecha", label: "Neecha" };
      if (signIdx === 3) return { dignity: "Own Sign", sanskritDignity: "Swakshetra", label: "Swakshetra" };
      return { dignity: "Neutral", sanskritDignity: "Sama", label: "Sama" };

    case "Mars":
      if (signIdx === 9) return { dignity: "Exalted", sanskritDignity: "Uchcha", label: "Uchcha (Exalted)" };
      if (signIdx === 3) return { dignity: "Debilitated", sanskritDignity: "Neecha", label: "Neecha" };
      if (signIdx === 0 || signIdx === 7) return { dignity: "Own Sign", sanskritDignity: "Swakshetra", label: "Swakshetra" };
      if (signIdx === 5 || signIdx === 2) return { dignity: "Enemy", sanskritDignity: "Sathuru", label: "Sathuru" };
      return { dignity: "Neutral", sanskritDignity: "Sama", label: "Sama" };

    case "Mercury":
      if (signIdx === 5) return { dignity: "Exalted", sanskritDignity: "Uchcha", label: "Uchcha (Exalted)" };
      if (signIdx === 11) return { dignity: "Debilitated", sanskritDignity: "Neecha", label: "Neecha" };
      if (signIdx === 2) return { dignity: "Own Sign", sanskritDignity: "Swakshetra", label: "Swakshetra" };
      return { dignity: "Neutral", sanskritDignity: "Sama", label: "Sama" };

    case "Jupiter":
      if (signIdx === 3) return { dignity: "Exalted", sanskritDignity: "Uchcha", label: "Uchcha (Exalted)" };
      if (signIdx === 9) return { dignity: "Debilitated", sanskritDignity: "Neecha", label: "Neecha" };
      if (signIdx === 8 || signIdx === 11) return { dignity: "Own Sign", sanskritDignity: "Swakshetra", label: "Swakshetra" };
      return { dignity: "Friend", sanskritDignity: "Mitra", label: "Mitra" };

    case "Venus":
      if (signIdx === 11) return { dignity: "Exalted", sanskritDignity: "Uchcha", label: "Uchcha (Exalted)" };
      if (signIdx === 5) return { dignity: "Debilitated", sanskritDignity: "Neecha", label: "Neecha" };
      if (signIdx === 1 || signIdx === 6) return { dignity: "Own Sign", sanskritDignity: "Swakshetra", label: "Swakshetra" };
      return { dignity: "Neutral", sanskritDignity: "Sama", label: "Sama" };

    case "Saturn":
      if (signIdx === 6) return { dignity: "Exalted", sanskritDignity: "Uchcha", label: "Uchcha (Exalted)" };
      if (signIdx === 0) return { dignity: "Debilitated", sanskritDignity: "Neecha", label: "Neecha" };
      if (signIdx === 9 || signIdx === 10) return { dignity: "Own Sign", sanskritDignity: "Swakshetra", label: "Swakshetra" };
      if (signIdx === 2 || signIdx === 5) return { dignity: "Friend", sanskritDignity: "Mitra", label: "Mitra" };
      return { dignity: "Neutral", sanskritDignity: "Sama", label: "Sama" };

    case "Rahu":
      if (signIdx === 1) return { dignity: "Exalted", sanskritDignity: "Uchcha", label: "Uchcha (Exalted)" };
      if (signIdx === 7) return { dignity: "Debilitated", sanskritDignity: "Neecha", label: "Neecha" };
      return { dignity: "Neutral", sanskritDignity: "Sama", label: "Sama" };

    case "Ketu":
      if (signIdx === 7) return { dignity: "Exalted", sanskritDignity: "Uchcha", label: "Uchcha (Exalted)" };
      if (signIdx === 1) return { dignity: "Debilitated", sanskritDignity: "Neecha", label: "Neecha" };
      return { dignity: "Neutral", sanskritDignity: "Sama", label: "Sama" };

    case "Uranus":
      if (signIdx === 10) return { dignity: "Own Sign", sanskritDignity: "Swakshetra", label: "Swakshetra" };
      return { dignity: "Neutral", sanskritDignity: "Sama", label: "Sama" };

    case "Neptune":
      if (signIdx === 9) return { dignity: "Neecha Bhanga", sanskritDignity: "Neecha Bhanga", label: "Neecha Bhanga" };
      if (signIdx === 11) return { dignity: "Own Sign", sanskritDignity: "Swakshetra", label: "Swakshetra" };
      return { dignity: "Neutral", sanskritDignity: "Sama", label: "Sama" };

    default:
      return { dignity: "Neutral", sanskritDignity: "Sama", label: "Sama" };
  }
}

export interface CelestialPlacement {
  name: string;
  color: string;
  tropicalLon: number;
  siderealLon: number;
  sign: ZodiacSignInfo;
  degInSign: number;
  formattedDegree: string;
  houseNumber: number;
  houseName: string;
  dignity: { dignity: string; sanskritDignity: string; label: string };
  isRetrograde?: boolean;
  isAboveHorizon: boolean;
  alt: number;
  mag: number;
}

/**
 * Computes complete Vedic & Astronomical astrological chart data.
 */
export function getFullAstrologicalChart(
  birthData: BirthData,
  system: ZodiacSystem = "sidereal"
): {
  ayanamsa: number;
  ascendant: ReturnType<typeof getAscendantAndMC>;
  placements: CelestialPlacement[];
  visibleCount: number;
} {
  const utc = localToUTC(birthData.local, birthData.utcOffset);
  const jd = toJulianDate(utc);

  const asc = getAscendantAndMC(jd, birthData.location);
  const ayanamsa = asc.ayanamsa;
  const moon = getMoonInfo(jd);
  const planets = getAllPlanets(jd);
  const nodes = getLunarNodes(jd, ayanamsa);

  const sunEq = sunEquatorial(jd);
  const sunHoriz = equatorialToHorizontal(sunEq, birthData.location, jd);

  // Horizontal coords for Moon
  const moonHoriz = equatorialToHorizontal(moon.equatorial, birthData.location, jd);

  const rawList: {
    name: string;
    color: string;
    tropicalLon: number;
    equatorial?: { ra: number; dec: number };
    mag: number;
    alt: number;
    isRetrograde?: boolean;
  }[] = [
    // Sun
    {
      name: "Sun",
      color: "#ffc83b",
      tropicalLon: sunEclipticLongitude(jd),
      equatorial: sunEq,
      mag: -26.7,
      alt: sunHoriz.alt,
    },
    // Moon
    {
      name: "Moon",
      color: "#e9e5d2",
      tropicalLon: moon.ecliptic.lon,
      equatorial: moon.equatorial,
      mag: -12.7 * Math.max(0.1, moon.illumination),
      alt: moonHoriz.alt,
    },
    // Planets
    ...planets.map((p) => {
      const eqOfDate = precessFromJ2000(p.equatorial, jd);
      const horiz = equatorialToHorizontal(eqOfDate, birthData.location, jd);
      return {
        name: p.name,
        color: p.color,
        tropicalLon: p.eclipticLon,
        equatorial: eqOfDate,
        mag: p.mag,
        alt: horiz.alt,
        isRetrograde: ["Venus", "Jupiter", "Saturn"].includes(p.name),
      };
    }),
    // Rahu & Ketu
    {
      name: "Rahu",
      color: "#8888cc",
      tropicalLon: nodes.rahuTropical,
      mag: 99,
      alt: 0,
    },
    {
      name: "Ketu",
      color: "#c8a050",
      tropicalLon: nodes.ketuTropical,
      mag: 99,
      alt: 0,
    },
  ];

  const placements: CelestialPlacement[] = rawList.map((item) => {
    const siderealLon = normalizeDeg(item.tropicalLon - ayanamsa);
    const activeLon = system === "sidereal" ? siderealLon : item.tropicalLon;
    const signInfo = getSignFromLongitude(activeLon);
    const houseInfo = getBhavaHouse(siderealLon, asc.siderealAsc);
    const dignity = getVedicDignity(item.name, siderealLon);

    const isAboveHorizon = item.alt > 0;

    return {
      name: item.name,
      color: item.color,
      tropicalLon: item.tropicalLon,
      siderealLon,
      sign: signInfo.sign,
      degInSign: signInfo.degInSign,
      formattedDegree: signInfo.formatted,
      houseNumber: houseInfo.houseNumber,
      houseName: houseInfo.houseName,
      dignity,
      isRetrograde: item.isRetrograde,
      isAboveHorizon,
      alt: item.alt,
      mag: item.mag,
    };
  });

  const visibleCount = placements.filter((p) => p.isAboveHorizon).length;

  return {
    ayanamsa,
    ascendant: asc,
    placements,
    visibleCount,
  };
}
