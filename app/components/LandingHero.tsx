"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";

/* ============================================
   LANDING HERO — Cinematic Title & CTA Reveal
   - Staggered letter-by-letter "CELESTIA" reveal
   - Subtitle fade-in after title completes
   - Luminous "Reveal Your Sky" call-to-action button
   - Click, Enter key, or scroll-down triggers onContinue
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
    y: -40,
    scale: 0.97,
    filter: "blur(4px)",
    transition: { duration: 0.7, ease: EASE_OUT_EXPO },
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
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 1.2,
      ease: EASE_OUT_EXPO,
      delay: TITLE.length * 0.12 + 0.8,
    },
  },
};

const buttonVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.94 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 1.0,
      ease: EASE_OUT_EXPO,
      delay: TITLE.length * 0.12 + 1.3,
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

  // Keyboard: Enter or ArrowDown or Space
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

      {/* Luminous Call To Action Button */}
      <motion.div
        className="landing-cta-container"
        variants={buttonVariants}
      >
        <motion.button
          className="landing-cta-btn"
          onClick={onContinue}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.97 }}
          tabIndex={0}
          aria-label="Reveal your birth sky"
        >
          <span className="landing-cta-glow" aria-hidden="true" />
          <span className="landing-cta-sparkle" aria-hidden="true">✦</span>
          <span className="landing-cta-text">Reveal Your Sky</span>
          <span className="landing-cta-arrow" aria-hidden="true">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
        </motion.button>
        <p className="landing-cta-hint mono">or scroll to begin</p>
      </motion.div>
    </motion.section>
  );
}
