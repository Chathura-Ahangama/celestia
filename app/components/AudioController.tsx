"use client";

import { useEffect, useRef, useState } from "react";

/** A tiny opt-in generative drone: no asset download, no surprise audio. */
export default function AudioController() {
  const [playing, setPlaying] = useState(false);
  const contextRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    return () => {
      void contextRef.current?.close();
    };
  }, []);

  const toggleAudio = () => {
    if (playing) {
      masterGainRef.current?.gain.linearRampToValueAtTime(0, (contextRef.current?.currentTime ?? 0) + 0.2);
      setPlaying(false);
      return;
    }

    const AudioContextClass = window.AudioContext;
    const context = contextRef.current ?? new AudioContextClass();
    contextRef.current = context;
    const master = context.createGain();
    master.gain.setValueAtTime(0, context.currentTime);
    master.gain.linearRampToValueAtTime(0.025, context.currentTime + 0.8);
    master.connect(context.destination);

    [73.42, 110, 146.83].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 0 ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.value = index === 0 ? 0.55 : 0.14;
      oscillator.connect(gain);
      gain.connect(master);
      oscillator.start();
    });
    masterGainRef.current = master;
    void context.resume();
    setPlaying(true);
  };

  return (
    <button type="button" className="sky-icon-button" onClick={toggleAudio} aria-pressed={playing}>
      <span aria-hidden="true">{playing ? "◼" : "♫"}</span>
      {playing ? "Sound on" : "Ambient sound"}
    </button>
  );
}
