"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useRestTimer() {
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const playBeep = useCallback(() => {
    try {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio isn't critical — fail silently (e.g. autoplay-blocked browsers)
    }
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.(200);
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          setRunning(false);
          playBeep();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [running, playBeep]);

  const start = useCallback((seconds: number) => {
    setTotalSeconds(seconds);
    setSecondsLeft(seconds);
    setRunning(true);
  }, []);

  const addSeconds = useCallback((delta: number) => {
    setSecondsLeft((s) => Math.max(0, s + delta));
    setTotalSeconds((t) => Math.max(0, t + delta));
  }, []);

  const stop = useCallback(() => {
    setRunning(false);
    setSecondsLeft(0);
  }, []);

  return { secondsLeft, totalSeconds, running, start, addSeconds, stop };
}

export type RestTimerApi = ReturnType<typeof useRestTimer>;
