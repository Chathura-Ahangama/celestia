"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { BirthData } from "../page";
import { searchCities, type CityEntry } from "../data/cities";

/* ── Iris transition timing (ms) ── */
const IRIS_GATHER_DURATION = 600;   // button border draws in
const IRIS_EXPAND_DURATION = 800;   // circle expands to fill screen
const IRIS_HOLD_DURATION = 400;     // brief darkness before reveal

/* ============================================
   BIRTH FORM — The Celestial Instrument
   Glass-panel birth data entry with city
   autocomplete, date/time inputs, and a
   cinematic submit button.
   ============================================ */

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const formVariants = {
  hidden: { opacity: 0, y: 40, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.8, ease: EASE_OUT_EXPO },
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.5, ease: EASE_OUT_EXPO },
  },
};

// Generate year options (1920–current year)
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from(
  { length: CURRENT_YEAR - 1920 + 1 },
  (_, i) => CURRENT_YEAR - i
);

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

interface BirthFormProps {
  onReveal: (data: BirthData) => void;
}

export default function BirthForm({ onReveal }: BirthFormProps) {
  // Date
  const [year, setYear] = useState(1995);
  const [month, setMonth] = useState(4); // April
  const [day, setDay] = useState(14);

  // Time
  const [hour, setHour] = useState(8);
  const [minute, setMinute] = useState(30);
  const [isPM, setIsPM] = useState(false);

  // City
  const [cityQuery, setCityQuery] = useState("Colombo");
  const [selectedCity, setSelectedCity] = useState<CityEntry | null>({
    name: "Colombo, Sri Lanka",
    lat: 6.9271,
    lon: 79.8612,
    utcOffset: 5.5,
  });
  const [suggestions, setSuggestions] = useState<CityEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const cityInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLUListElement>(null);

  // Iris transition
  const [irisActive, setIrisActive] = useState(false);
  const [irisPhase, setIrisPhase] = useState<"gather" | "expand" | "hold" | "done">("gather");
  const [irisOrigin, setIrisOrigin] = useState({ x: 50, y: 50 });
  const submitRef = useRef<HTMLButtonElement>(null);

  // Adjust day if month/year changes
  const maxDay = daysInMonth(year, month);
  useEffect(() => {
    if (day > maxDay) setDay(maxDay);
  }, [year, month, day, maxDay]);

  // City search
  const handleCityChange = useCallback((value: string) => {
    setCityQuery(value);
    setSelectedCity(null);
    setHighlightedIndex(-1);
    if (value.trim().length >= 1) {
      const results = searchCities(value);
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  const selectCity = useCallback((city: CityEntry) => {
    setSelectedCity(city);
    setCityQuery(city.name);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
  }, []);

  // Keyboard nav for suggestions
  const handleCityKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!showSuggestions) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
      } else if (e.key === "Enter" && highlightedIndex >= 0) {
        e.preventDefault();
        selectCity(suggestions[highlightedIndex]);
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
      }
    },
    [showSuggestions, suggestions, highlightedIndex, selectCity]
  );

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        cityInputRef.current &&
        !cityInputRef.current.contains(e.target as Node) &&
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Convert 12h → 24h
  const hour24 = isPM ? (hour === 12 ? 12 : hour + 12) : (hour === 12 ? 0 : hour);

  // Validation
  const isValid = selectedCity !== null && year > 0 && month > 0 && day > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !selectedCity || irisActive) return;

    // Capture button center for iris origin
    if (submitRef.current) {
      const rect = submitRef.current.getBoundingClientRect();
      setIrisOrigin({
        x: ((rect.left + rect.width / 2) / window.innerWidth) * 100,
        y: ((rect.top + rect.height / 2) / window.innerHeight) * 100,
      });
    }

    // Start iris sequence
    setIrisActive(true);
    setIrisPhase("gather");

    // Phase 1: button border gathers
    setTimeout(() => setIrisPhase("expand"), IRIS_GATHER_DURATION);

    // Phase 2: circle expands to fill screen
    setTimeout(() => setIrisPhase("hold"), IRIS_GATHER_DURATION + IRIS_EXPAND_DURATION);

    // Phase 3: hold darkness, then fire the reveal
    setTimeout(() => {
      setIrisPhase("done");
      onReveal({
        local: { year, month, day, hour: hour24, minute },
        location: { lat: selectedCity.lat, lon: selectedCity.lon },
        cityName: selectedCity.name,
        utcOffset: selectedCity.utcOffset,
      });
    }, IRIS_GATHER_DURATION + IRIS_EXPAND_DURATION + IRIS_HOLD_DURATION);
  };

  return (
    <AnimatePresence>
      <motion.section
        className="viewport-center"
        variants={formVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
      >
        <form
          className="glass birth-form"
          onSubmit={handleSubmit}
          autoComplete="off"
        >
          {/* Header */}
          <h2 className="birth-form-title">When were you born?</h2>
          <p className="birth-form-subtitle">
            Enter your birth details and we&apos;ll reconstruct the sky.
          </p>

          {/* ── Date Row ── */}
          <div className="birth-form-group">
            <label className="birth-form-label">Date of Birth</label>
            <div className="birth-form-row birth-form-date-row">
              <div className="birth-form-field">
                <span className="birth-form-field-label">Year</span>
                <select
                  id="birth-year"
                  className="birth-form-select"
                  value={year}
                  onChange={(e) => setYear(Number(e.target.value))}
                >
                  {YEARS.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="birth-form-field">
                <span className="birth-form-field-label">Month</span>
                <select
                  id="birth-month"
                  className="birth-form-select"
                  value={month}
                  onChange={(e) => setMonth(Number(e.target.value))}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="birth-form-field">
                <span className="birth-form-field-label">Day</span>
                <select
                  id="birth-day"
                  className="birth-form-select"
                  value={day}
                  onChange={(e) => setDay(Number(e.target.value))}
                >
                  {Array.from({ length: maxDay }, (_, i) => i + 1).map(
                    (d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    )
                  )}
                </select>
              </div>
            </div>
          </div>

          {/* ── Time Row ── */}
          <div className="birth-form-group">
            <label className="birth-form-label">Time of Birth</label>
            <div className="birth-form-row birth-form-time-row">
              <div className="birth-form-field">
                <span className="birth-form-field-label">Hour</span>
                <select
                  id="birth-hour"
                  className="birth-form-select"
                  value={hour}
                  onChange={(e) => setHour(Number(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>

              <span className="birth-form-colon">:</span>

              <div className="birth-form-field">
                <span className="birth-form-field-label">Min</span>
                <select
                  id="birth-minute"
                  className="birth-form-select"
                  value={minute}
                  onChange={(e) => setMinute(Number(e.target.value))}
                >
                  {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                    <option key={m} value={m}>
                      {String(m).padStart(2, "0")}
                    </option>
                  ))}
                </select>
              </div>

              <div className="birth-form-ampm">
                <button
                  type="button"
                  className={`birth-form-ampm-btn ${!isPM ? "active" : ""}`}
                  onClick={() => setIsPM(false)}
                >
                  AM
                </button>
                <button
                  type="button"
                  className={`birth-form-ampm-btn ${isPM ? "active" : ""}`}
                  onClick={() => setIsPM(true)}
                >
                  PM
                </button>
              </div>
            </div>
          </div>

          {/* ── City ── */}
          <div className="birth-form-group">
            <label className="birth-form-label" htmlFor="birth-city">
              Birth City
            </label>
            <div className="birth-form-city-wrapper">
              <input
                ref={cityInputRef}
                id="birth-city"
                type="text"
                className="birth-form-input"
                value={cityQuery}
                onChange={(e) => handleCityChange(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onKeyDown={handleCityKeyDown}
                placeholder="Search for a city…"
                aria-autocomplete="list"
                aria-expanded={showSuggestions}
                aria-controls="city-suggestions"
                autoComplete="off"
              />

              {/* Autocomplete dropdown */}
              {showSuggestions && (
                <ul
                  ref={suggestionsRef}
                  id="city-suggestions"
                  className="birth-form-suggestions"
                  role="listbox"
                >
                  {suggestions.map((city, i) => (
                    <li
                      key={city.name}
                      className={`birth-form-suggestion ${
                        i === highlightedIndex ? "highlighted" : ""
                      }`}
                      role="option"
                      aria-selected={i === highlightedIndex}
                      onMouseEnter={() => setHighlightedIndex(i)}
                      onMouseDown={(e) => {
                        e.preventDefault(); // prevent blur before click
                        selectCity(city);
                      }}
                    >
                      <span className="suggestion-name">{city.name}</span>
                      <span className="suggestion-meta">
                        UTC{city.utcOffset >= 0 ? "+" : ""}
                        {city.utcOffset}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Selected city confirmation */}
            {selectedCity && (
              <p className="birth-form-city-confirm">
                📍 {selectedCity.name} — UTC
                {selectedCity.utcOffset >= 0 ? "+" : ""}
                {selectedCity.utcOffset}
              </p>
            )}
          </div>

          {/* ── Submit ── */}
          <button
            ref={submitRef}
            type="submit"
            className={`birth-form-submit ${irisActive ? "iris-active" : ""}`}
            disabled={!isValid || irisActive}
          >
            {/* SVG ring for the gather animation */}
            <svg
              className="birth-form-submit-ring"
              viewBox="0 0 200 52"
              preserveAspectRatio="none"
            >
              <rect
                x="1" y="1" width="198" height="50"
                rx="14" ry="14"
                fill="none"
                stroke="var(--nova)"
                strokeWidth="2"
                className="iris-ring-path"
              />
            </svg>
            <span className="birth-form-submit-text">
              {irisActive ? "Aligning the stars…" : "Reveal My Sky"}
            </span>
            {!irisActive && (
              <svg
                className="birth-form-submit-icon"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v8M8 12l4 4 4-4" />
              </svg>
            )}
          </button>
        </form>

        {/* ── Iris aperture overlay ── */}
        {irisActive && (
          <div
            className={`iris-overlay iris-${irisPhase}`}
            style={{
              "--iris-x": `${irisOrigin.x}%`,
              "--iris-y": `${irisOrigin.y}%`,
            } as React.CSSProperties}
            aria-hidden="true"
          />
        )}
      </motion.section>
    </AnimatePresence>
  );
}
