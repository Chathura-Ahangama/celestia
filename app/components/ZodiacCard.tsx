"use client";

import type { BirthData } from "../page";
import { localToUTC, toJulianDate } from "../lib/astronomy";
import { getZodiac } from "../lib/zodiac";
import zodiacInfo from "../data/zodiacInfo.json";

type ZodiacInfo = {
  symbol: string;
  element: "fire" | "earth" | "air" | "water";
  dateRange: string;
  traits: string[];
  description: string;
};

export default function ZodiacCard({ birthData }: { birthData: BirthData }) {
  const jd = toJulianDate(localToUTC(birthData.local, birthData.utcOffset));
  const zodiac = getZodiac(jd);
  const info = zodiacInfo[zodiac.sign] as ZodiacInfo;

  return (
    <section className={`zodiac-card element-${info.element}`}>
      <div className="zodiac-card-symbol" aria-hidden="true">{zodiac.symbol}</div>
      <div>
        <p className="sky-card-kicker">Sun sign · {zodiac.degreesInSign.toFixed(1)}°</p>
        <h2>{zodiac.sign}</h2>
        <p className="zodiac-card-traits">{info.traits.slice(0, 3).join(" · ")}</p>
      </div>
      <p className="zodiac-card-description">{info.description}</p>
    </section>
  );
}
