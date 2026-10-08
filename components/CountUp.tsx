"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

function format(value: number, suffix?: string) {
  return `${value.toLocaleString()}${suffix ?? ""}`;
}

/**
 * Animated number: counts from 0 to `value` with an ease-out curve once
 * mounted. The server renders the final value (no layout shift, no flash,
 * correct for reduced-motion users); the count-up itself writes textContent
 * directly on animation frames — no state, no re-renders.
 */
export function CountUp({
  value,
  duration = 900,
  className,
  suffix,
}: {
  value: number;
  /** ms */
  duration?: number;
  className?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced || value <= 0 || duration <= 0) {
      node.textContent = format(value, suffix);
      return;
    }
    let frame: number | null = null;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = format(Math.round(eased * value), suffix);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [value, duration, suffix]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {format(value, suffix)}
    </span>
  );
}
