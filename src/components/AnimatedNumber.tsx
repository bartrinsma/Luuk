"use client";

import { animate, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";

interface AnimatedNumberProps {
  value: number;
  format: (v: number) => string;
  duration?: number;
  delay?: number;
  className?: string;
}

/** Rolt op van 0 naar het eindbedrag. Schrijft direct naar de DOM: geen re-render per frame. */
export function AnimatedNumber({ value, format, duration = 1.6, delay = 0, className }: AnimatedNumberProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (reduce) {
      node.textContent = format(value);
      return;
    }
    const controls = animate(0, value, {
      duration,
      delay,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        node.textContent = format(v);
      },
    });
    return () => controls.stop();
  }, [value, format, duration, delay, reduce]);

  return (
    <span ref={ref} className={className} aria-label={format(value)}>
      {format(0)}
    </span>
  );
}
