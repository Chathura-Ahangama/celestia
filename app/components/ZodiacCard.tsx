"use client";

import type { BirthData } from "../page";
import { localToUTC, toJulianDate } from "../lib/astronomy";
import { getMoonInfo } from "../lib/moonPhase";
import { getAscendantAndMC, getSignFromLongitude, getLahiriAyanamsa } from "../lib/astrology";
import { sunEclipticLongitude } from "../lib/astronomy";
import zodiacInfo from "../data/zodiacInfo.json";

type ZodiacInfo = {
  symbol: string;
  element: "fire" | "earth" | "air" | "water";
  dateRange: string;
  traits: string[];
  description: string;
};

export default function ZodiacCard({ birthData }: { birthData: BirthData }) {
  const utc = localToUTC(birthData.local, birthData.utcOffset);
  const jd = toJulianDate(utc);
  const ayanamsa = getLahiriAyanamsa(jd);

  // Sidereal Sun
  const tropicalSun = sunEclipticLongitude(jd);
  const siderealSun = (tropicalSun - ayanamsa + 360) % 360;
  const sunSign = getSignFromLongitude(siderealSun);

  // Sidereal Moon (Rashi)
  const moon = getMoonInfo(jd);
  const siderealMoon = (moon.ecliptic.lon - ayanamsa + 360) % 360;
  const moonSign = getSignFromLongitude(siderealMoon);

  // Lagna (Ascendant)
  const asc = getAscendantAndMC(jd, birthData.location);

  const info = (zodiacInfo as Record<string, ZodiacInfo>)[sunSign.sign.english] || {
    symbol: sunSign.sign.symbol,
    element: sunSign.sign.element,
    dateRange: "",
    traits: ["Balanced", "Harmonious", "Visionary"],
    description: "Born under the celestial harmony of the cosmos.",
  };

  return (
    <section className={`zodiac-card element-${info.element}`}>
      <div className="zodiac-card-symbol" aria-hidden="true">
        {sunSign.sign.symbol}
      </div>
      <div>
        <p className="sky-card-kicker">
          Vedic Sun Sign · {Math.floor(sunSign.degInSign)}° {Math.floor((sunSign.degInSign % 1) * 60)}&apos;
        </p>
        <h2>
          {sunSign.sign.sanskrit} ({sunSign.sign.english})
        </h2>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px", marginTop: "4px", fontSize: "0.7rem", color: "var(--moonbeam)" }}>
          <span><strong>Lagna:</strong> {asc.lagnaSign.sanskrit} ({Math.floor(asc.lagnaDegInSign)}°)</span>
          <span><strong>Moon Rashi:</strong> {moonSign.sign.sanskrit} ({Math.floor(moonSign.degInSign)}°)</span>
        </div>
      </div>
      <p className="zodiac-card-description">{info.description}</p>
    </section>
  );
}
