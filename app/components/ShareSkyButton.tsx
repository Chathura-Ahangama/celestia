"use client";

import { useState } from "react";
import type { BirthData } from "../page";
import { localToUTC, toJulianDate } from "../lib/astronomy";
import { getZodiac } from "../lib/zodiac";

export default function ShareSkyButton({ birthData }: { birthData: BirthData }) {
  const [status, setStatus] = useState<"idle" | "copied">("idle");

  const share = async () => {
    const jd = toJulianDate(localToUTC(birthData.local, birthData.utcOffset));
    const sign = getZodiac(jd).sign;
    const text = `My birth sky over ${birthData.cityName} — a ${sign} sky, preserved in Celestia.`;

    try {
      if (navigator.share) {
        await navigator.share({ title: "My Celestia birth sky", text, url: window.location.href });
      } else {
        await navigator.clipboard.writeText(`${text} ${window.location.href}`);
        setStatus("copied");
        window.setTimeout(() => setStatus("idle"), 1800);
      }
    } catch (error) {
      if ((error as DOMException).name !== "AbortError") console.error("Sharing failed", error);
    }
  };

  return (
    <button type="button" className="sky-icon-button" onClick={share}>
      <span aria-hidden="true">↗</span>
      {status === "copied" ? "Link copied" : "Share sky"}
    </button>
  );
}
