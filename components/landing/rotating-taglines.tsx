"use client";

import { useEffect, useMemo, useState } from "react";
import { inter } from "@/lib/fonts";
import headline from "./hero-headline.module.css";
import styles from "./rotating-taglines.module.css";

const LINES = [
  "Get the hours back your team spends on outreach",
  "Stop paying agency fees for outreach that gets ignored",
  "Stop losing candidates to slow, generic replies",
] as const;

const DISPLAY_MS = 3040;
const FADE_MS = 500;
const SCROLL_MS = 523;

type RotatingTaglinesProps = {
  variant?: "header" | "headline";
};

export function RotatingTaglines({ variant = "headline" }: RotatingTaglinesProps) {
  const isHeader = variant === "header";
  const scrollLines = useMemo(() => [...LINES, LINES[0]!], []);

  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [scrollIndex, setScrollIndex] = useState(0);
  const [noTransition, setNoTransition] = useState(false);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (isHeader) {
      const interval = window.setInterval(() => {
        setScrollIndex((current) => current + 1);
      }, DISPLAY_MS);

      return () => window.clearInterval(interval);
    }

    const fadeMs = reducedMotion ? 0 : FADE_MS;
    let fadeTimeout: number | undefined;

    const tick = () => {
      setVisible(false);
      fadeTimeout = window.setTimeout(() => {
        setIndex((current) => (current + 1) % LINES.length);
        setVisible(true);
      }, fadeMs);
    };

    const interval = window.setInterval(tick, DISPLAY_MS);
    return () => {
      window.clearInterval(interval);
      if (fadeTimeout !== undefined) window.clearTimeout(fadeTimeout);
    };
  }, [isHeader]);

  useEffect(() => {
    if (!isHeader || scrollIndex !== LINES.length) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const animMs = reducedMotion ? 0 : SCROLL_MS;

    const timeout = window.setTimeout(() => {
      setNoTransition(true);
      setScrollIndex(0);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setNoTransition(false));
      });
    }, animMs);

    return () => window.clearTimeout(timeout);
  }, [isHeader, scrollIndex]);

  if (isHeader) {
    return (
      <div className={styles.scrollViewport} aria-live="polite" aria-atomic="true">
        <div
          className={`${styles.scrollTrack} ${noTransition ? styles.scrollTrackNoTransition : ""}`}
          style={{ transform: `translateY(calc(-1 * ${scrollIndex} * var(--line-h, 2.9em)))` }}
        >
          {scrollLines.map((line, i) => (
            <span
              key={`${line}-${i}`}
              className={`${inter.className} italic ${styles.belowLogo} ${styles.scrollLine}`}
            >
              {line}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <span
      className={`${inter.className} italic ${headline.line} ${styles.smaller} ${styles.animated} ${
        visible ? styles.visible : styles.hidden
      }`}
      aria-live="polite"
      aria-atomic="true"
    >
      {LINES[index]}
    </span>
  );
}
