"use client";

import type { BirthData } from "../page";
import { localToUTC, toJulianDate } from "../lib/astronomy";
import { getMoonInfo } from "../lib/moonPhase";
import MoonRenderer from "./MoonRenderer";
import ZodiacCard from "./ZodiacCard";
import PlanetaryPositions from "./PlanetaryPositions";
import ConstellationMap from "./ConstellationMap";
import AudioController from "./AudioController";
import ShareSkyButton from "./ShareSkyButton";

interface SkyInfoPanelProps {
  birthData: BirthData;
  linesVisible: boolean;
  labelsVisible: boolean;
  onLinesChange: () => void;
  onLabelsChange: () => void;
}

export default function SkyInfoPanel(props: SkyInfoPanelProps) {
  const jd = toJulianDate(localToUTC(props.birthData.local, props.birthData.utcOffset));
  const moon = getMoonInfo(jd);

  return (
    <aside className="sky-info-panel" aria-label="Your birth sky details">
      <div className="sky-info-panel-scroll">
        <div className="sky-info-title-row">
          <div>
            <p className="sky-card-kicker">Your sky remembers</p>
            <h1>Born beneath these stars</h1>
          </div>
        </div>
        <MoonRenderer moon={moon} observerLat={props.birthData.location.lat} />
        <ZodiacCard birthData={props.birthData} />
        <PlanetaryPositions birthData={props.birthData} />
        <ConstellationMap
          linesVisible={props.linesVisible}
          labelsVisible={props.labelsVisible}
          onLinesChange={props.onLinesChange}
          onLabelsChange={props.onLabelsChange}
        />
        <div className="sky-info-actions">
          <AudioController />
          <ShareSkyButton birthData={props.birthData} />
        </div>
      </div>
    </aside>
  );
}
