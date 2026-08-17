"use client";

import type { BirthData } from "../page";
import { localToUTC, toJulianDate } from "../lib/astronomy";
import { getMoonInfo } from "../lib/moonPhase";
import { getVisibleDSOs, getDSOTypeLabel } from "../lib/dso";
import MoonRenderer from "./MoonRenderer";
import ZodiacCard from "./ZodiacCard";
import PlanetaryPositions from "./PlanetaryPositions";
import ConstellationMap from "./ConstellationMap";
import AudioController from "./AudioController";
import ShareSkyButton from "./ShareSkyButton";

interface SkyInfoPanelProps {
  birthData: BirthData;
  linesVisible: boolean;
  constellationNamesVisible: boolean;
  labelsVisible: boolean;
  dsosVisible: boolean;
  milkyWayVisible: boolean;
  guidesVisible: boolean;
  onLinesChange: () => void;
  onConstellationNamesChange: () => void;
  onLabelsChange: () => void;
  onDsosChange: () => void;
  onMilkyWayChange: () => void;
  onGuidesChange: () => void;
}

export default function SkyInfoPanel(props: SkyInfoPanelProps) {
  const jd = toJulianDate(localToUTC(props.birthData.local, props.birthData.utcOffset));
  const moon = getMoonInfo(jd);
  const visibleDSOs = getVisibleDSOs(props.birthData.location, jd, 10);

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

        {visibleDSOs.length > 0 && (
          <section className="dsos-card">
            <div className="sky-card-heading">
              <p className="sky-card-kicker">Deep sky objects in view</p>
              <span className="mono" style={{ fontSize: "11px", opacity: 0.6 }}>
                {visibleDSOs.length} objects
              </span>
            </div>
            <ul className="dso-list" style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "8px" }}>
              {visibleDSOs.slice(0, 4).map((dso) => (
                <li
                  key={dso.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 10px",
                    borderRadius: "6px",
                    background: "rgba(255, 255, 255, 0.02)",
                    border: "1px solid rgba(255, 255, 255, 0.04)",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <strong style={{ fontSize: "12px", color: "#e8e4f0" }}>
                        {dso.name}
                      </strong>
                      <span className="mono" style={{ fontSize: "10px", opacity: 0.5 }}>
                        {dso.id}
                      </span>
                    </div>
                    <p style={{ fontSize: "11px", opacity: 0.6, margin: 0 }}>
                      {getDSOTypeLabel(dso.type)} · in {dso.constellation}
                    </p>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span className="mono" style={{ fontSize: "11px", color: "#cad7ff" }}>
                      {dso.mag !== null ? `${dso.mag > 0 ? `+${dso.mag.toFixed(1)}` : dso.mag.toFixed(1)}m` : ""}
                    </span>
                    <p className="mono" style={{ fontSize: "10px", opacity: 0.45, margin: 0 }}>
                      Alt {Math.round(dso.horizontal.alt)}°
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <ConstellationMap
          linesVisible={props.linesVisible}
          constellationNamesVisible={props.constellationNamesVisible}
          labelsVisible={props.labelsVisible}
          dsosVisible={props.dsosVisible}
          milkyWayVisible={props.milkyWayVisible}
          guidesVisible={props.guidesVisible}
          onLinesChange={props.onLinesChange}
          onConstellationNamesChange={props.onConstellationNamesChange}
          onLabelsChange={props.onLabelsChange}
          onDsosChange={props.onDsosChange}
          onMilkyWayChange={props.onMilkyWayChange}
          onGuidesChange={props.onGuidesChange}
        />

        <div className="sky-info-actions">
          <AudioController />
          <ShareSkyButton birthData={props.birthData} />
        </div>
      </div>
    </aside>
  );
}
