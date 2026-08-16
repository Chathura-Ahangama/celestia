"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

/* ============================================
   LANDING HERO — Cinematic title reveal
   - Staggered letter-by-letter "CELESTIA" reveal
   - Subtitle fade-in after title completes
   - Breathing chevron scroll indicator
   - Click or scroll-down triggers onContinue
   ============================================ */

const TITLE = "CELESTIA";
const SUBTITLE = "The sky remembers the moment you arrived.";

/* Framer-motion variants */
const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;

const containerVariants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.6,
    },
  },
  exit: {
    opacity: 0,
    y: -30,
    transition: { duration: 0.6, ease: EASE_OUT_EXPO },
  },
};

const letterVariants = {
  hidden: {
    opacity: 0,
    y: 30,
    filter: "brightness(0.5)",
  },
  visible: {
    opacity: 1,
    y: 0,
    filter: "brightness(1)",
    transition: {
      duration: 0.7,
      ease: EASE_OUT_EXPO,
    },
  },
};

const subtitleVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 1.2,
      ease: EASE_OUT_EXPO,
      delay: TITLE.length * 0.12 + 0.8, // after all letters + pause
    },
  },
};

const chevronVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      duration: 0.8,
      delay: TITLE.length * 0.12 + 1.6, // after subtitle
    },
  },
};

interface LandingHeroProps {
  onContinue: () => void;
}

export default function LandingHero({ onContinue }: LandingHeroProps) {
  const sectionRef = useRef<HTMLElement>(null);

  // Listen for scroll-down or wheel to trigger transition
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (e.deltaY > 30) {
        onContinue();
      }
    },
    [onContinue]
  );

  // Listen for touch swipe up
  const touchStartY = useRef(0);
  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  }, []);

  const handleTouchEnd = useCallback(
    (e: TouchEvent) => {
      const deltaY = touchStartY.current - e.changedTouches[0].clientY;
      if (deltaY > 50) {
        onContinue();
      }
    },
    [onContinue]
  );

  // Keyboard: Enter or ArrowDown
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === "ArrowDown" || e.key === " ") {
        e.preventDefault();
        onContinue();
      }
    },
    [onContinue]
  );

  useEffect(() => {
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
      window.removeEventListener("keydown", handleKey);
    };
  }, [handleWheel, handleTouchStart, handleTouchEnd, handleKey]);

  return (
    <AnimatePresence>
      <motion.section
        ref={sectionRef}
        className="viewport-center landing-hero"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        role="banner"
        aria-label="Celestia — landing"
      >
        {/* Title: letter-by-letter reveal */}
        <h1 className="landing-title" aria-label={TITLE}>
          {TITLE.split("").map((char, i) => (
            <motion.span
              key={i}
              className="landing-letter"
              variants={letterVariants}
              aria-hidden="true"
            >
              {char}
            </motion.span>
          ))}
        </h1>

        {/* Subtitle */}
        <motion.p
          className="landing-subtitle"
          variants={subtitleVariants}
        >
          {SUBTITLE}
        </motion.p>

        {/* Breathing chevron — clickable scroll hint */}
        <motion.button
          className="landing-chevron"
          variants={chevronVariants}
          onClick={onContinue}
          aria-label="Continue to birth form"
          tabIndex={0}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </motion.button>
      </motion.section>
    </AnimatePresence>
  );
}
