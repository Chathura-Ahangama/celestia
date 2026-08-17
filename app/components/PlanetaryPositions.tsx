"use client";

import type { BirthData } from "../page";
import { localToUTC, toJulianDate } from "../lib/astronomy";
import { getMoonInfo } from "../lib/moonPhase";
import { getAllPlanets } from "../lib/planets";
import { signFromLongitude } from "../lib/zodiac";

export default function PlanetaryPositions({ birthData }: { birthData: BirthData }) {
  const jd = toJulianDate(localToUTC(birthData.local, birthData.utcOffset));
  const moon = getMoonInfo(jd);
  const positions = [
    { name: "Moon", color: "#e9e5d2", sign: signFromLongitude(moon.ecliptic.lon) },
    ...getAllPlanets(jd).map((planet) => ({
      name: planet.name,
      color: planet.color,
      sign: signFromLongitude(planet.eclipticLon),
    })),
  ];

  return (
    <section className="planetary-positions">
      <p className="sky-card-kicker">Celestial placements</p>
      <ul>
        {positions.map((position) => (
          <li key={position.name}>
            <span className="planet-dot" style={{ backgroundColor: position.color }} aria-hidden="true" />
            <span>{position.name}</span>
            <strong>in {position.sign}</strong>
          </li>
        ))}
      </ul>
    </section>
  );
}
