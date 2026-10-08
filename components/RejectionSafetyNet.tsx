"use client";

import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

/**
 * Last-resort safety net for anything the per-button try/catch layers miss
 * (e.g. a server action invoked from a component we did not wrap, or a
 * background fetch failing after the page was left). A rejected promise
 * would otherwise die silently in the console — the user sees a dead
 * button with zero feedback.
 *
 * Rate-limited to one toast per 10 seconds so a burst of failures (e.g.
 * right after a lost connection) reads as a single notice, not spam.
 */
export function RejectionSafetyNet() {
  const { toast } = useToast();

  useEffect(() => {
    let lastToastAt = 0;
    const onRejection = (_event: PromiseRejectionEvent) => {
      const now = Date.now();
      if (now - lastToastAt < 10_000) return;
      lastToastAt = now;
      toast({
        title: "Something did not go through",
        description: "The last action may not have completed — please retry it.",
      });
    };
    window.addEventListener("unhandledrejection", onRejection);
    return () => window.removeEventListener("unhandledrejection", onRejection);
  }, [toast]);

  return null;
}
