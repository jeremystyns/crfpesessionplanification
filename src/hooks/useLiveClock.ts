/**
 * useLiveClock — Temps du mode Live à la seconde, pour la vue plein écran et la
 * cellule flottante. Le planificateur ne rafraîchit son état que toutes les 5 s :
 * ici, une horloge locale d'une seconde recalcule le temps restant à partir de
 * l'origine du live (`getElapsedMinutes`).
 */
import { useEffect, useState } from 'react';
import { useNow } from '@/hooks/useNow';
import { getProgress, getTimePressure, type TimePressure } from '@/lib/liveFocus';
import type { CurrentDisplay } from '@/lib/playModeUtils';

export type LiveMode = 'running' | 'waiting' | 'ended';

export interface LiveClock {
  mode: LiveMode;
  nowMs: number;
  /** Durée totale et temps déjà écoulé de l'élément en cours (secondes). */
  totalSeconds: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  progress: number;
  pressure: TimePressure;
  /** Avant le prochain élément (secondes), s'il y en a un. */
  untilNextSeconds: number | null;
  /** Durée du prochain élément (minutes). */
  nextDurationMinutes: number | null;
}

export const useLiveClock = (display: CurrentDisplay, getElapsedMinutes: () => number): LiveClock => {
  const nowMs = useNow(1000);
  const elapsedMinutes = getElapsedMinutes();
  const { current, next } = display;

  const untilNextSeconds = next ? Math.max(0, (next.startMin - elapsedMinutes) * 60) : null;
  const nextDurationMinutes = next ? Math.max(0, next.endMin - next.startMin) : null;

  if (current) {
    const totalSeconds = Math.max(1, (current.endMin - current.startMin) * 60);
    const elapsedSeconds = Math.min(totalSeconds, Math.max(0, (elapsedMinutes - current.startMin) * 60));
    const remainingSeconds = Math.max(0, totalSeconds - elapsedSeconds);
    return {
      mode: 'running',
      nowMs,
      totalSeconds,
      elapsedSeconds,
      remainingSeconds,
      progress: getProgress(elapsedSeconds, totalSeconds),
      pressure: getTimePressure(remainingSeconds, totalSeconds),
      untilNextSeconds,
      nextDurationMinutes,
    };
  }

  return {
    mode: next ? 'waiting' : 'ended',
    nowMs,
    totalSeconds: 0,
    elapsedSeconds: 0,
    remainingSeconds: 0,
    progress: next ? 0 : 1,
    pressure: 'normal',
    untilNextSeconds,
    nextDurationMinutes,
  };
};

/** Vrai pendant 300 ms après chaque son joué (pour faire réagir la cloche). */
export const useSoundPulse = (soundPulse: number): boolean => {
  const [pulsing, setPulsing] = useState(false);
  useEffect(() => {
    if (soundPulse === 0) return;
    setPulsing(true);
    const timeout = window.setTimeout(() => setPulsing(false), 300);
    return () => window.clearTimeout(timeout);
  }, [soundPulse]);
  return pulsing;
};
