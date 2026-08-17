"use client";

import { useState } from "react";
import type { BirthData } from "../page";
import { getActiveMeteorShowers } from "../lib/planets";
import {
  getFullAstrologicalChart,
  type ZodiacSystem,
} from "../lib/astrology";

export default function PlanetaryPositions({ birthData }: { birthData: BirthData }) {
  const [zodiacSystem, setZodiacSystem] = useState<ZodiacSystem>("sidereal");

  const chart = getFullAstrologicalChart(birthData, zodiacSystem);
  const { ascendant, placements, visibleCount, ayanamsa } = chart;

  const activeShowers = getActiveMeteorShowers(birthData.local.month, birthData.local.day);

  return (
    <div className="planetary-section-wrapper">
      <section className="planetary-positions">
        {/* Header with System Switcher */}
        <div className="sky-card-heading">
          <div>
            <p className="sky-card-kicker">Celestial & Bhava Placements</p>
            <h3 style={{ margin: 0, fontSize: "0.85rem", color: "var(--starlight)", fontWeight: 400 }}>
              {zodiacSystem === "sidereal" ? "Nirayana (Lahiri Ayanamsa)" : "Sayana (Tropical)"}
            </h3>
          </div>

          <div style={{ display: "flex", gap: "4px" }}>
            <button
              type="button"
              className={`system-toggle-btn ${zodiacSystem === "sidereal" ? "active" : ""}`}
              onClick={() => setZodiacSystem("sidereal")}
              title={`Vedic Sidereal with Lahiri Ayanamsa (${ayanamsa.toFixed(2)}°)`}
            >
              Vedic / Sidereal
            </button>
            <button
              type="button"
              className={`system-toggle-btn ${zodiacSystem === "tropical" ? "active" : ""}`}
              onClick={() => setZodiacSystem("tropical")}
              title="Western Tropical (Sayana)"
            >
              Tropical
            </button>
          </div>
        </div>

        {/* Lagna (Ascendant) Banner */}
        <div className="lagna-card">
          <div className="lagna-left">
            <span className="lagna-badge mono">LAGNA</span>
            <div>
              <strong className="lagna-title">
                {ascendant.lagnaSign.sanskrit} ({ascendant.lagnaSign.english})
              </strong>
              <p className="lagna-subtitle mono">
                Ascendant at {Math.floor(ascendant.lagnaDegInSign)}° {Math.floor((ascendant.lagnaDegInSign % 1) * 60)}&apos; · 1st House Center
              </p>
            </div>
          </div>
          <div className="lagna-right mono">
            <span>Ayanamsa</span>
            <strong style={{ color: "var(--nova)" }}>{ayanamsa.toFixed(2)}°</strong>
          </div>
        </div>

        {/* Planet & Node List */}
        <div className="placements-summary mono" style={{ fontSize: "11px", opacity: 0.6, margin: "8px 0 4px" }}>
          <span>{placements.length} celestial bodies · {visibleCount} visible in sky</span>
        </div>

        <ul className="planet-list">
          {placements.map((pos) => {
            const hasDignityBadge = pos.dignity && pos.dignity.label !== "Sama" && pos.dignity.label !== "Neutral";

            return (
              <li key={pos.name} className="planet-item">
                <div className="planet-left">
                  <span
                    className="planet-dot"
                    style={{
                      backgroundColor: pos.color,
                      boxShadow: pos.isAboveHorizon
                        ? `0 0 6px ${pos.color}`
                        : "none",
                    }}
                    aria-hidden="true"
                  />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span className="planet-name">{pos.name}</span>
                      {pos.mag < 90 && (
                        <span className="planet-mag mono">
                          {pos.mag > 0 ? `+${pos.mag.toFixed(1)}` : pos.mag.toFixed(1)}m
                        </span>
                      )}
                      {pos.isRetrograde && (
                        <span className="retrograde-badge mono" title="Vakra / Retrograde motion">
                          ℞ Vakra
                        </span>
                      )}
                    </div>
                    <span className="planet-house mono">
                      {pos.houseName.split(" ")[0]} House ({pos.houseName.split("(")[1]?.replace(")", "") || ""})
                    </span>
                  </div>
                </div>

                <div className="planet-right">
                  <div style={{ textAlign: "right" }}>
                    <div className="planet-coord mono">
                      {Math.floor(pos.degInSign)}° {String(Math.floor((pos.degInSign % 1) * 60)).padStart(2, "0")}&apos;{" "}
                      <strong>{pos.sign.sanskrit}</strong>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "4px", marginTop: "2px" }}>
                      {hasDignityBadge && (
                        <span className="dignity-badge mono">
                          {pos.dignity.label}
                        </span>
                      )}
                      {pos.isAboveHorizon && (
                        <span
                          className="planet-badge mono"
                          title={`Altitude above horizon: ${pos.alt.toFixed(1)}°`}
                        >
                          Visible
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Active Meteor Showers */}
      {activeShowers.length > 0 && (
        <section className="meteor-showers-card" style={{ marginTop: "16px" }}>
          <div className="sky-card-heading">
            <p className="sky-card-kicker">Active meteor showers</p>
            <span aria-hidden="true">☄</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "8px" }}>
            {activeShowers.slice(0, 2).map((shower) => (
              <div
                key={shower.id}
                style={{
                  background: "rgba(255, 255, 255, 0.03)",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255, 255, 255, 0.05)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    marginBottom: "4px",
                  }}
                >
                  <strong style={{ color: "#e8e4f0", fontSize: "13px" }}>
                    {shower.name}
                  </strong>
                  {shower.isPeak ? (
                    <span
                      className="mono"
                      style={{
                        fontSize: "10px",
                        color: "#ffd2a1",
                        background: "rgba(255, 210, 161, 0.15)",
                        padding: "1px 5px",
                        borderRadius: "4px",
                      }}
                    >
                      Peak Activity
                    </span>
                  ) : (
                    <span className="mono" style={{ fontSize: "10px", opacity: 0.5 }}>
                      Active
                    </span>
                  )}
                </div>
                <p style={{ fontSize: "11px", opacity: 0.75, lineHeight: 1.4, margin: 0 }}>
                  Radiating from {shower.constellation} · ZHR ~{shower.zhr}/hr · From {shower.parent}
                </p>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
