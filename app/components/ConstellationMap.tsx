"use client";

interface ConstellationMapProps {
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

/** Controls for celestial layers rendered into the sky dome. */
export default function ConstellationMap({
  linesVisible,
  constellationNamesVisible,
  labelsVisible,
  dsosVisible,
  milkyWayVisible,
  guidesVisible,
  onLinesChange,
  onConstellationNamesChange,
  onLabelsChange,
  onDsosChange,
  onMilkyWayChange,
  onGuidesChange,
}: ConstellationMapProps) {
  return (
    <section className="constellation-map" aria-label="Sky map layers">
      <div className="sky-card-heading">
        <p className="sky-card-kicker">Celestial layers</p>
        <span aria-hidden="true">✦</span>
      </div>
      <div className="sky-layer-toggles">
        <button
          type="button"
          className={linesVisible ? "sky-layer-toggle active" : "sky-layer-toggle"}
          onClick={onLinesChange}
          aria-pressed={linesVisible}
        >
          Constellations
        </button>
        <button
          type="button"
          className={constellationNamesVisible ? "sky-layer-toggle active" : "sky-layer-toggle"}
          onClick={onConstellationNamesChange}
          aria-pressed={constellationNamesVisible}
        >
          Constellation Names
        </button>
        <button
          type="button"
          className={labelsVisible ? "sky-layer-toggle active" : "sky-layer-toggle"}
          onClick={onLabelsChange}
          aria-pressed={labelsVisible}
        >
          Star Names
        </button>
        <button
          type="button"
          className={dsosVisible ? "sky-layer-toggle active" : "sky-layer-toggle"}
          onClick={onDsosChange}
          aria-pressed={dsosVisible}
        >
          Deep Sky (DSO)
        </button>
        <button
          type="button"
          className={milkyWayVisible ? "sky-layer-toggle active" : "sky-layer-toggle"}
          onClick={onMilkyWayChange}
          aria-pressed={milkyWayVisible}
        >
          Milky Way
        </button>
        <button
          type="button"
          className={guidesVisible ? "sky-layer-toggle active" : "sky-layer-toggle"}
          onClick={onGuidesChange}
          aria-pressed={guidesVisible}
        >
          Ecliptic & Equator
        </button>
      </div>
    </section>
  );
}
