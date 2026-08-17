"use client";

interface ConstellationMapProps {
  linesVisible: boolean;
  labelsVisible: boolean;
  onLinesChange: () => void;
  onLabelsChange: () => void;
}

/** Controls for the constellation geometry rendered directly into the canvas. */
export default function ConstellationMap({
  linesVisible,
  labelsVisible,
  onLinesChange,
  onLabelsChange,
}: ConstellationMapProps) {
  return (
    <section className="constellation-map" aria-label="Sky map layers">
      <div className="sky-card-heading">
        <p className="sky-card-kicker">Explore the map</p>
        <span aria-hidden="true">✦</span>
      </div>
      <div className="sky-layer-toggles">
        <button
          type="button"
          className={linesVisible ? "sky-layer-toggle active" : "sky-layer-toggle"}
          onClick={onLinesChange}
          aria-pressed={linesVisible}
        >
          Constellation lines
        </button>
        <button
          type="button"
          className={labelsVisible ? "sky-layer-toggle active" : "sky-layer-toggle"}
          onClick={onLabelsChange}
          aria-pressed={labelsVisible}
        >
          Star labels
        </button>
      </div>
    </section>
  );
}
