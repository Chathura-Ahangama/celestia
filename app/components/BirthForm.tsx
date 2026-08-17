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
   Glass-panel birth data entry with placeholders:
   2002-10-18 07:53 AM at Kalawana, Sri Lanka
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
    y: -30,
    scale: 0.96,
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

const PLACEHOLDER_DATA = {
  year: 2002,
  month: 10, // October
  day: 18,
  hour: 7,
  minute: 53,
  isPM: false, // AM (7:53 AM)
  city: {
    name: "Kalawana, Sri Lanka",
    lat: 6.4253,
    lon: 80.4072,
    utcOffset: 5.5,
  },
};

interface BirthFormProps {
  onReveal: (data: BirthData) => void;
}

export default function BirthForm({ onReveal }: BirthFormProps) {
  // Date states (initially empty with placeholders)
  const [year, setYear] = useState<number | "">("");
  const [month, setMonth] = useState<number | "">("");
  const [day, setDay] = useState<number | "">("");

  // Time states (initially empty with placeholders, default AM)
  const [hour, setHour] = useState<number | "">("");
  const [minute, setMinute] = useState<number | "">("");
  const [isPM, setIsPM] = useState(false);

  // City states (initially empty with placeholder)
  const [cityQuery, setCityQuery] = useState("");
  const [selectedCity, setSelectedCity] = useState<CityEntry | null>(null);
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

  // Effective days in month
  const activeYear = year === "" ? PLACEHOLDER_DATA.year : year;
  const activeMonth = month === "" ? PLACEHOLDER_DATA.month : month;
  const maxDay = daysInMonth(activeYear, activeMonth);

  const handleYearChange = (newYear: number | "") => {
    setYear(newYear);
    if (newYear !== "" && day !== "") {
      const newMax = daysInMonth(newYear, activeMonth);
      if (day > newMax) setDay(newMax);
    }
  };

  const handleMonthChange = (newMonth: number | "") => {
    setMonth(newMonth);
    if (newMonth !== "" && day !== "") {
      const newMax = daysInMonth(activeYear, newMonth);
      if (day > newMax) setDay(newMax);
    }
  };

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
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          selectCity(suggestions[highlightedIndex]);
        } else if (suggestions.length > 0) {
          selectCity(suggestions[0]);
        }
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (irisActive) return;

    // Resolve final effective values
    const effectiveYear = year === "" ? PLACEHOLDER_DATA.year : year;
    const effectiveMonth = month === "" ? PLACEHOLDER_DATA.month : month;
    const effectiveDayNum =
      day === ""
        ? PLACEHOLDER_DATA.day
        : Math.min(day, daysInMonth(effectiveYear, effectiveMonth));
    const effectiveHour = hour === "" ? PLACEHOLDER_DATA.hour : hour;
    const effectiveMinute = minute === "" ? PLACEHOLDER_DATA.minute : minute;
    const effectiveHour24 = isPM
      ? effectiveHour === 12
        ? 12
        : effectiveHour + 12
      : effectiveHour === 12
      ? 0
      : effectiveHour;

    let effectiveCity = selectedCity;
    if (!effectiveCity) {
      if (cityQuery.trim() !== "") {
        const results = searchCities(cityQuery);
        effectiveCity = results[0] || PLACEHOLDER_DATA.city;
      } else {
        effectiveCity = PLACEHOLDER_DATA.city;
      }
    }

    // Capture button center for iris origin
    if (submitRef.current) {
      const rect = submitRef.current.getBoundingClientRect();
      setIrisOrigin({
        x: ((rect.left + rect.width / 2) / window.innerWidth) * 100,
        y: ((rect.top + rect.height / 2) / window.innerHeight) * 100,
      });
    }

    // Log submission to database asynchronously (non-blocking)
    fetch("/api/submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        year: effectiveYear,
        month: effectiveMonth,
        day: effectiveDayNum,
        hour: effectiveHour24,
        minute: effectiveMinute,
        cityName: effectiveCity.name,
        lat: effectiveCity.lat,
        lon: effectiveCity.lon,
        utcOffset: effectiveCity.utcOffset,
      }),
    }).catch((err) => {
      console.warn("[BirthForm] Failed to log submission to database:", err);
    });

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
        local: {
          year: effectiveYear,
          month: effectiveMonth,
          day: effectiveDayNum,
          hour: effectiveHour24,
          minute: effectiveMinute,
        },
        location: { lat: effectiveCity.lat, lon: effectiveCity.lon },
        cityName: effectiveCity.name,
        utcOffset: effectiveCity.utcOffset,
      });
    }, IRIS_GATHER_DURATION + IRIS_EXPAND_DURATION + IRIS_HOLD_DURATION);
  };

  return (
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
                className={`birth-form-select ${year === "" ? "is-placeholder" : ""}`}
                value={year}
                onChange={(e) =>
                  handleYearChange(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
              >
                <option value="" disabled hidden>
                  2002
                </option>
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
                className={`birth-form-select ${month === "" ? "is-placeholder" : ""}`}
                value={month}
                onChange={(e) =>
                  handleMonthChange(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
              >
                <option value="" disabled hidden>
                  October
                </option>
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
                className={`birth-form-select ${day === "" ? "is-placeholder" : ""}`}
                value={day}
                onChange={(e) =>
                  setDay(e.target.value === "" ? "" : Number(e.target.value))
                }
              >
                <option value="" disabled hidden>
                  18
                </option>
                {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
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
                className={`birth-form-select ${hour === "" ? "is-placeholder" : ""}`}
                value={hour}
                onChange={(e) =>
                  setHour(e.target.value === "" ? "" : Number(e.target.value))
                }
              >
                <option value="" disabled hidden>
                  07
                </option>
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
                className={`birth-form-select ${minute === "" ? "is-placeholder" : ""}`}
                value={minute}
                onChange={(e) =>
                  setMinute(e.target.value === "" ? "" : Number(e.target.value))
                }
              >
                <option value="" disabled hidden>
                  53
                </option>
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
              role="combobox"
              className="birth-form-input"
              value={cityQuery}
              onChange={(e) => handleCityChange(e.target.value)}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              onKeyDown={handleCityKeyDown}
              placeholder="e.g. Kalawana, Sri Lanka"
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
                    onClick={() => selectCity(city)}
                    onMouseEnter={() => setHighlightedIndex(i)}
                  >
                    <span className="suggestion-name">{city.name}</span>
                    <span className="suggestion-meta">
                      {city.lat.toFixed(2)}°, {city.lon.toFixed(2)}° · UTC
                      {city.utcOffset >= 0
                        ? `+${city.utcOffset}`
                        : city.utcOffset}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selectedCity && (
            <p className="birth-form-city-confirm mono">
              ✓ {selectedCity.name} (UTC
              {selectedCity.utcOffset >= 0
                ? `+${selectedCity.utcOffset}`
                : selectedCity.utcOffset}
              )
            </p>
          )}
        </div>

        {/* ── Submit Button with Iris Ring ── */}
        <button
          ref={submitRef}
          type="submit"
          className={`birth-form-submit ${irisActive ? "iris-active" : ""}`}
          disabled={irisActive}
        >
          {/* SVG ring for the gathering animation */}
          <svg className="birth-form-submit-ring" viewBox="0 0 400 60">
            <rect
              className="iris-ring-path"
              x="2"
              y="2"
              width="396"
              height="56"
              rx="12"
              fill="none"
              stroke="var(--nova)"
              strokeWidth="2"
            />
          </svg>

          <span className="birth-form-submit-text">Reconstruct Sky</span>
          <span className="birth-form-submit-icon" aria-hidden="true">
            ✦
          </span>
        </button>
      </form>

      {/* ── Full-screen Iris Aperture Overlay ── */}
      {irisActive && (
        <div
          className={`iris-overlay iris-${irisPhase}`}
          style={
            {
              "--iris-x": `${irisOrigin.x}%`,
              "--iris-y": `${irisOrigin.y}%`,
            } as React.CSSProperties
          }
        />
      )}
    </motion.section>
  );
}
