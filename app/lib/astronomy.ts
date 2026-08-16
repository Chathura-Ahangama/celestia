/* ============================================
   CELESTIA — Core Astronomy Engine
   Based on standard Meeus astronomical algorithms.
   All angles internally in RADIANS unless suffixed *Deg.
   ============================================ */

// ---------- ANGLE HELPERS ----------
export const DEG2RAD = Math.PI / 180;
export const RAD2DEG = 180 / Math.PI;

/** Normalize an angle in DEGREES into [0, 360). */
export function normalizeDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

/** Normalize an angle in RADIANS into [0, 2π). */
export function normalizeRad(rad: number): number {
  const twoPi = 2 * Math.PI;
  let r = rad % twoPi;
  if (r < 0) r += twoPi;
  return r;
}

/** Normalize an hour-angle-like value in HOURS into [0, 24). */
export function normalizeHours(h: number): number {
  let x = h % 24;
  if (x < 0) x += 24;
  return x;
}

// Convenience trig that take DEGREES
export const sind = (deg: number) => Math.sin(deg * DEG2RAD);
export const cosd = (deg: number) => Math.cos(deg * DEG2RAD);
export const tand = (deg: number) => Math.tan(deg * DEG2RAD);
export const asind = (x: number) => Math.asin(x) * RAD2DEG;
export const acosd = (x: number) => Math.acos(x) * RAD2DEG;
export const atan2d = (y: number, x: number) => Math.atan2(y, x) * RAD2DEG;

// ---------- TYPES ----------
/** A moment in time, all components in UTC. */
export interface UTCDateTime {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second?: number; // 0-59
}

/** Equatorial coordinates. RA in degrees (0-360), Dec in degrees (-90..90). */
export interface EquatorialCoord {
  ra: number; // degrees
  dec: number; // degrees
}

/** Horizontal coordinates as seen by an observer. */
export interface HorizontalCoord {
  alt: number; // degrees, >0 = above horizon
  az: number; // degrees, 0=N, 90=E, 180=S, 270=W
}

/** Ecliptic coordinates. */
export interface EclipticCoord {
  lon: number; // ecliptic longitude, degrees
  lat: number; // ecliptic latitude, degrees
}

/** Observer location on Earth. */
export interface GeoLocation {
  lat: number; // degrees, +N
  lon: number; // degrees, +E
}

// ============================================
// A. JULIAN DATE
// ============================================

/**
 * Convert a UTC calendar date/time to Julian Date.
 * Uses the standard Meeus algorithm (valid for all Gregorian dates).
 */
export function toJulianDate(dt: UTCDateTime): number {
  let Y = dt.year;
  let M = dt.month;
  const D = dt.day + (dt.hour + dt.minute / 60 + (dt.second ?? 0) / 3600) / 24;

  // In Meeus, Jan & Feb are months 13 & 14 of the previous year.
  if (M <= 2) {
    Y -= 1;
    M += 12;
  }

  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4); // Gregorian calendar correction

  const JD =
    Math.floor(365.25 * (Y + 4716)) +
    Math.floor(30.6001 * (M + 1)) +
    D +
    B -
    1524.5;

  return JD;
}

/** Julian centuries since J2000.0 (JD 2451545.0). */
export function julianCenturies(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

/** Days since J2000.0. Useful for many low-precision formulae. */
export function daysSinceJ2000(jd: number): number {
  return jd - 2451545.0;
}

// ============================================
// B. SUN POSITION (ecliptic longitude → zodiac)
// ============================================

/**
 * Low-precision solar position. Returns the Sun's apparent
 * ecliptic longitude in degrees [0,360).
 * Matches the algorithm specified in the Celestia brief.
 */
export function sunEclipticLongitude(jd: number): number {
  const n = daysSinceJ2000(jd);

  // Mean anomaly (degrees)
  const M = normalizeDeg(357.5291 + 0.98560028 * n);

  // Equation of center (degrees)
  const C = 1.9148 * sind(M) + 0.02 * sind(2 * M) + 0.0003 * sind(3 * M);

  // Ecliptic longitude (degrees)
  // λ = M + C + 180 + 102.9372  (per brief; the 180+102.9372 = perihelion + 180)
  const lambda = normalizeDeg(M + C + 180 + 102.9372);

  return lambda;
}

/**
 * Full Sun equatorial position (RA/Dec) for sky rendering & Sun altitude.
 */
export function sunEquatorial(jd: number): EquatorialCoord {
  const lambda = sunEclipticLongitude(jd); // ecliptic lon (lat ~ 0 for Sun)
  const eps = obliquityOfEcliptic(jd); // obliquity

  const ra = normalizeDeg(atan2d(cosd(eps) * sind(lambda), cosd(lambda)));
  const dec = asind(sind(eps) * sind(lambda));

  return { ra, dec };
}

/** Obliquity of the ecliptic in degrees. */
export function obliquityOfEcliptic(jd: number): number {
  const T = julianCenturies(jd);
  // Mean obliquity (Meeus 22.2), arcsecond terms
  const eps0 =
    23 +
    26 / 60 +
    21.448 / 3600 -
    (46.815 / 3600) * T -
    (0.00059 / 3600) * T * T +
    (0.001813 / 3600) * T * T * T;
  return eps0;
}

// ============================================
// C. SIDEREAL TIME
// ============================================

/**
 * Greenwich Mean Sidereal Time in DEGREES [0,360).
 * (Meeus 12.4, high-accuracy polynomial.)
 */
export function greenwichMeanSiderealTime(jd: number): number {
  const T = julianCenturies(jd);
  const gmst =
    280.46061837 +
    360.98564736629 * (jd - 2451545.0) +
    0.000387933 * T * T -
    (T * T * T) / 38710000.0;
  return normalizeDeg(gmst);
}

/**
 * Local Sidereal Time in DEGREES [0,360).
 * @param lonDeg observer longitude, +East.
 */
export function localSiderealTime(jd: number, lonDeg: number): number {
  return normalizeDeg(greenwichMeanSiderealTime(jd) + lonDeg);
}

// ============================================
// D. COORDINATE TRANSFORM: Equatorial → Horizontal
// ============================================

/**
 * Convert equatorial (RA/Dec) to horizontal (Alt/Az) for an observer.
 * All inputs/outputs in degrees.
 *
 * HA  = LST - RA
 * Alt = arcsin( sinDec sinLat + cosDec cosLat cosHA )
 * Az  = atan2( -sinHA cosDec , cosDec sinLat cosHA - sinDec cosLat )
 * Az normalized to 0=N, 90=E, 180=S, 270=W.
 */
export function equatorialToHorizontal(
  eq: EquatorialCoord,
  location: GeoLocation,
  jd: number,
): HorizontalCoord {
  const lst = localSiderealTime(jd, location.lon); // degrees
  const ha = normalizeDeg(lst - eq.ra); // hour angle, degrees

  const lat = location.lat;

  const sinAlt = sind(eq.dec) * sind(lat) + cosd(eq.dec) * cosd(lat) * cosd(ha);
  const alt = asind(Math.max(-1, Math.min(1, sinAlt)));

  const az = normalizeDeg(
    atan2d(
      -sind(ha) * cosd(eq.dec),
      cosd(eq.dec) * sind(lat) * cosd(ha) - sind(eq.dec) * cosd(lat),
    ),
  );

  return { alt, az };
}

// ============================================
// E. ECLIPTIC → EQUATORIAL
// ============================================

/**
 * Convert ecliptic coordinates (lon/lat, degrees) to equatorial (RA/Dec).
 */
export function eclipticToEquatorial(
  ecl: EclipticCoord,
  jd: number,
): EquatorialCoord {
  const eps = obliquityOfEcliptic(jd);
  const { lon, lat } = ecl;

  const ra = normalizeDeg(
    atan2d(sind(lon) * cosd(eps) - tand(lat) * sind(eps), cosd(lon)),
  );
  const dec = asind(sind(lat) * cosd(eps) + cosd(lat) * sind(eps) * sind(lon));

  return { ra, dec };
}

// ============================================
// G. TIME-ZONE / LOCAL → UTC HELPER
// ============================================

/**
 * Build a UTCDateTime from local birth details + a UTC offset in hours.
 * e.g. birth at 14:30 local in UTC+5.5 → subtract 5.5 hours to get UTC.
 *
 * Returns a properly normalized UTCDateTime (handles day/month/year rollover)
 * by round-tripping through a JS Date in UTC.
 */
export function localToUTC(
  local: UTCDateTime,
  utcOffsetHours: number,
): UTCDateTime {
  const ms = Date.UTC(
    local.year,
    local.month - 1,
    local.day,
    local.hour,
    local.minute,
    local.second ?? 0,
  );
  // subtract the offset to convert local → UTC
  const utc = new Date(ms - utcOffsetHours * 3600 * 1000);

  return {
    year: utc.getUTCFullYear(),
    month: utc.getUTCMonth() + 1,
    day: utc.getUTCDate(),
    hour: utc.getUTCHours(),
    minute: utc.getUTCMinutes(),
    second: utc.getUTCSeconds(),
  };
}

// ============================================
// H. PRECESSION (catalog J2000 → date of birth)
// ============================================

/**
 * Apply precession of the equinoxes to a J2000 equatorial coordinate,
 * bringing it to the equinox of `jd`. Uses the rigorous rotation-angle
 * method (Meeus 21). Keeps stars aligned for historical/future dates.
 *
 * For dates near 2000 this is a tiny correction, but for 1969 or far-future
 * dates it keeps things honest.
 */
export function precessFromJ2000(
  eq: EquatorialCoord,
  jd: number,
): EquatorialCoord {
  const T = julianCenturies(jd); // centuries from J2000 to target

  // Accumulated precession angles in arcseconds (Meeus 21.3)
  const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) / 3600;
  const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) / 3600;
  const theta = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) / 3600;

  const ra0 = eq.ra;
  const dec0 = eq.dec;

  const A = cosd(dec0) * sind(ra0 + zeta);
  const B =
    cosd(theta) * cosd(dec0) * cosd(ra0 + zeta) - sind(theta) * sind(dec0);
  const C =
    sind(theta) * cosd(dec0) * cosd(ra0 + zeta) + cosd(theta) * sind(dec0);

  const ra = normalizeDeg(atan2d(A, B) + z);
  const dec = asind(Math.max(-1, Math.min(1, C)));

  return { ra, dec };
}

// ============================================
// I. PROJECTION: Horizontal → Screen (stereographic)
// ============================================

/**
 * Result of projecting a sky point onto the 2D canvas.
 * `visible` is false when the point is below the horizon or behind
 * the viewer (outside the projected field).
 */
export interface ProjectedPoint {
  x: number; // 0..width
  y: number; // 0..height
  visible: boolean;
  alt: number; // passthrough for convenience
  az: number;
}

/**
 * Stereographic projection of the sky dome onto the canvas.
 * We look at a chosen azimuth (`centerAz`) with the zenith mapped
 * toward the top of the screen. This gives a natural "looking up/out"
 * feel and preserves circles (great for a starfield).
 *
 * @param horiz     alt/az of the object (degrees)
 * @param width     canvas width in px
 * @param height    canvas height in px
 * @param centerAz  azimuth the camera faces (degrees) — used for panning
 * @param fovDeg    field of view (degrees) controlling zoom (default 180 = full dome)
 */
export function projectToScreen(
  horiz: HorizontalCoord,
  width: number,
  height: number,
  centerAz = 180,
  fovDeg = 180,
): ProjectedPoint {
  const { alt, az } = horiz;

  // Below horizon → not visible (but we still return coords for ghost-moon etc.)
  const visible = alt > 0;

  // Zenith distance (90° = horizon, 0° = straight up)
  const zenithDist = 90 - alt;

  // Azimuth relative to camera facing direction
  const relAz = normalizeDeg(az - centerAz);
  // Convert to [-180, 180] so left/right split around center
  const relAzCentered = relAz > 180 ? relAz - 360 : relAz;

  // Stereographic radial factor. Scale so fovDeg maps to canvas half-height.
  const r = Math.tan((zenithDist * DEG2RAD) / 2);
  const rMax = Math.tan(((fovDeg / 2) * DEG2RAD) / 2) || 1;

  // Normalized radius (0 at zenith, ~1 at horizon for 180° fov)
  const rNorm = r / rMax;

  const scale = Math.min(width, height) * 0.5;

  // Azimuth becomes the angle around the projection circle.
  const angle = relAzCentered * DEG2RAD;

  const x = width / 2 + scale * rNorm * Math.sin(angle);
  // y grows downward on canvas; higher alt = closer to center/top
  const y = height / 2 + scale * rNorm * Math.cos(angle);

  return { x, y, visible, alt, az };
}

// ============================================
// J. CONVENIENCE: full pipeline for a catalog star
// ============================================

/**
 * Take a J2000 catalog RA/Dec and produce its on-screen position for a
 * given observer + time. Handles precession → horizontal → projection.
 */
export function starToScreen(
  eqJ2000: EquatorialCoord,
  location: GeoLocation,
  jd: number,
  width: number,
  height: number,
  centerAz = 180,
  fovDeg = 180,
): ProjectedPoint {
  const eqOfDate = precessFromJ2000(eqJ2000, jd);
  const horiz = equatorialToHorizontal(eqOfDate, location, jd);
  return projectToScreen(horiz, width, height, centerAz, fovDeg);
}

// ============================================
// K. SELF-TEST (dev only — call from console if you want)
// ============================================

/**
 * Quick sanity checks against known reference values.
 * Returns an array of {label, value, expected} you can console.table().
 * Not called automatically anywhere.
 */
export function __selfTest() {
  const results: { label: string; value: number; expected: string }[] = [];

  // J2000 epoch: 2000-01-01 12:00 UTC → JD 2451545.0
  const jdEpoch = toJulianDate({
    year: 2000,
    month: 1,
    day: 1,
    hour: 12,
    minute: 0,
  });
  results.push({
    label: "JD at J2000 (2000-01-01 12:00 UTC)",
    value: jdEpoch,
    expected: "2451545.0",
  });

  // 1969-07-20 20:17 UTC (Apollo 11 landing)
  const jdApollo = toJulianDate({
    year: 1969,
    month: 7,
    day: 20,
    hour: 20,
    minute: 17,
  });
  results.push({
    label: "JD Apollo 11 landing",
    value: jdApollo,
    expected: "~2440423.345",
  });

  // Sun ecliptic longitude on 1969-07-20 → should be ~117-118° (Cancer: 90-120)
  results.push({
    label: "Sun ecl. lon 1969-07-20 (deg)",
    value: sunEclipticLongitude(jdApollo),
    expected: "~117 (Cancer)",
  });

  // Sun ecliptic longitude on 2000-12-25 → Capricorn (270-300)
  const jdXmas = toJulianDate({
    year: 2000,
    month: 12,
    day: 25,
    hour: 12,
    minute: 0,
  });
  results.push({
    label: "Sun ecl. lon 2000-12-25 (deg)",
    value: sunEclipticLongitude(jdXmas),
    expected: "~273-274 (Capricorn)",
  });

  return results;
}
