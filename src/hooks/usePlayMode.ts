/**
 * usePlayMode — Live Mode state: tracks the active block during a running session.
 *
 * Role: Runtime companion to useWorkshop. Reads WorkshopData but manages its own
 *       timer (ticks every 5 s). Auto-activates when the scheduled start time is
 *       reached; supports manual start/stop with a guard that keeps a stopped
 *       scheduled window off, while a later window starts again.
 * Used by: WorkshopPlanner (live bar rendering + timeline highlighting)
 */
import { withBase } from '@/lib/basePath';
import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { WorkshopData } from '@/types/workshop';
import { timeToMinutes } from '@/lib/clock-time';
import {
  flattenTimeline,
  computePlayStates,
  resolveCurrentDisplay,
  PlayState,
  CurrentDisplay,
} from '@/lib/playModeUtils';
import { PLAY_MODE_TICK_MS } from '@/lib/timing';

export interface PlayModeState {
  isActive: boolean;
  currentDisplay: CurrentDisplay | null;
  blockPlayStates: Map<string, PlayState>;
  /** Minutes elapsed since the live session started (clamped to ≥ 0).
   *  Always defined when `isActive` is true; meaningless otherwise. */
  elapsedMinutes: number;
  elapsedInCurrentBlock: number;
  currentBlockEffectiveDuration: number;
  soundPulse: number;
  /** Temps en pause : le compte à rebours est figé jusqu'à `resume`. */
  isPaused: boolean;
  pause: () => void;
  resume: () => void;
  togglePause: () => void;
  /** Passe au début de l'étape suivante / précédente (null : pas d'étape dans ce sens). */
  canGoNext: boolean;
  canGoPrevious: boolean;
  goToNext: () => void;
  goToPrevious: () => void;
  /** Lance le live à partir d'un élément, ou, s'il tourne déjà, s'y rend (la pause est conservée). */
  startFromItem: (itemId: string) => boolean;
  /** Minutes écoulées calculées à l'instant de l'appel (le tick de 5 s ne limite pas la précision). */
  getElapsedMinutes: () => number;
  activate: () => void;
  deactivate: () => void;
}

export function usePlayMode(
  workshop: WorkshopData,
  totalDuration: number,
  soundsEnabled = true,
): PlayModeState {
  const [now, setNow] = useState(() => new Date());
  // When the user manually pressed "Live", we record the timestamp so that
  // elapsed is calculated from that moment (not from the scheduled sessionStart).
  const [manualStartedAt, setManualStartedAt] = useState<Date | null>(null);
  // Start of the scheduled window the user explicitly stopped — prevents its auto re-activation.
  const [stoppedWindow, setStoppedWindow] = useState<number | null>(null);
  const [soundPulse, setSoundPulse] = useState(0);
  // Instant (ms) où le temps a été mis en pause ; null = le temps court.
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const pausedAtRef = useRef<number | null>(null);
  pausedAtRef.current = pausedAt;

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), PLAY_MODE_TICK_MS);
    return () => clearInterval(interval);
  }, []);

  const { date, startTime } = workshop.workshop;

  const sessionStart = useMemo(() => {
    if (!date || !startTime) return null;
    return new Date(`${date}T${startTime}`);
  }, [date, startTime]);

  // Elapsed from scheduled session start (for auto mode)
  const autoElapsedMinutes = useMemo(() => {
    if (!sessionStart) return -Infinity;
    return (now.getTime() - sessionStart.getTime()) / 60000;
  }, [now, sessionStart]);

  // Auto-activate when we're within the session's scheduled time window
  const isAutoActive = useMemo(() => {
    if (!sessionStart || totalDuration === 0) return false;
    return autoElapsedMinutes >= 0 && autoElapsedMinutes <= totalDuration;
  }, [sessionStart, autoElapsedMinutes, totalDuration]);

  const scheduledWindow = isAutoActive ? sessionStart?.getTime() ?? null : null;

  // Active when:
  //  - manually started (overrides everything), OR
  //  - auto condition is met AND the user hasn't manually stopped this window
  const isActive =
    manualStartedAt !== null || (isAutoActive && stoppedWindow !== scheduledWindow);

  // Effective elapsed minutes:
  //  - Manual mode: from the moment the button was pressed
  //  - Auto mode: from the scheduled session start
  // Le temps de référence est figé tant que le live est en pause.
  const nowMs = pausedAt ?? now.getTime();
  const elapsedMinutes = useMemo(() => {
    if (manualStartedAt !== null) {
      return Math.max(0, (nowMs - manualStartedAt.getTime()) / 60000);
    }
    return Math.max(0, autoElapsedMinutes);
  }, [manualStartedAt, nowMs, autoElapsedMinutes]);

  // Origine du temps écoulé : appui manuel sur « Live », sinon début programmé.
  const originRef = useRef<number | null>(null);
  originRef.current = manualStartedAt !== null ? manualStartedAt.getTime() : sessionStart ? sessionStart.getTime() : null;
  const getElapsedMinutes = useCallback(
    () => (originRef.current === null ? 0 : Math.max(0, ((pausedAtRef.current ?? Date.now()) - originRef.current) / 60000)),
    [],
  );

  const flatBlocks = useMemo(() => {
    const sessionStartMinutes = startTime ? timeToMinutes(startTime) : undefined;
    return flattenTimeline(workshop.items, 0, sessionStartMinutes);
  }, [workshop.items, startTime]);

  const blockPlayStates = useMemo((): Map<string, PlayState> => {
    if (!isActive) return new Map();
    return computePlayStates(flatBlocks, elapsedMinutes);
  }, [isActive, flatBlocks, elapsedMinutes]);

  const currentDisplay = useMemo((): CurrentDisplay | null => {
    if (!isActive) return null;
    return resolveCurrentDisplay(flatBlocks, elapsedMinutes);
  }, [isActive, flatBlocks, elapsedMinutes]);

  const { elapsedInCurrentBlock, currentBlockEffectiveDuration } = useMemo(() => {
    if (!currentDisplay?.current) {
      return { elapsedInCurrentBlock: 0, currentBlockEffectiveDuration: 1 };
    }
    const { current } = currentDisplay;
    return {
      elapsedInCurrentBlock: Math.max(0, elapsedMinutes - current.startMin),
      currentBlockEffectiveDuration: Math.max(1, current.endMin - current.startMin),
    };
  }, [currentDisplay, elapsedMinutes]);

  const activate = useCallback(() => {
    // Start immediately from now, independent of scheduled time
    setManualStartedAt(new Date());
    setStoppedWindow(null);
    setPausedAt(null);
  }, []);

  const deactivate = useCallback(() => {
    setManualStartedAt(null);
    setStoppedWindow(scheduledWindow);
    setPausedAt(null);
  }, [scheduledWindow]);

  const isActiveRef = useRef(isActive);
  isActiveRef.current = isActive;
  const sessionStartRef = useRef(sessionStart);
  sessionStartRef.current = sessionStart;

  const pause = useCallback(() => {
    if (!isActiveRef.current || pausedAtRef.current !== null) return;
    // Un live lancé par l'horaire programmé passe en mode manuel avec la même origine.
    setManualStartedAt((prev) => prev ?? sessionStartRef.current);
    setPausedAt(Date.now());
  }, []);

  const resume = useCallback(() => {
    const at = pausedAtRef.current;
    if (at === null) return;
    const pausedFor = Date.now() - at;
    // Décaler l'origine de la durée de la pause : le temps repart d'où il s'était arrêté.
    setManualStartedAt((prev) => (prev ? new Date(prev.getTime() + pausedFor) : prev));
    setPausedAt(null);
  }, []);

  const togglePause = useCallback(() => {
    if (pausedAtRef.current !== null) resume();
    else pause();
  }, [pause, resume]);

  /** Place le live à `minutes` depuis le début (la pause éventuelle est conservée). */
  const seekTo = useCallback((minutes: number) => {
    const base = pausedAtRef.current ?? Date.now();
    setManualStartedAt(new Date(base - minutes * 60000));
    setStoppedWindow(null);
    setNow(new Date());
  }, []);

  // Débuts des étapes (éléments sans enfants), pour avancer ou reculer d'une étape.
  const stepStarts = useMemo(() => {
    const parents = new Set(flatBlocks.map((block) => block.parentId).filter(Boolean));
    const starts = flatBlocks.filter((block) => !parents.has(block.id)).map((block) => block.startMin);
    return [...new Set(starts)].sort((a, b) => a - b);
  }, [flatBlocks]);

  const nextTarget = isActive ? currentDisplay?.next?.startMin ?? null : null;
  const previousTarget = useMemo(() => {
    if (!isActive) return null;
    const current = currentDisplay?.current ?? null;
    const anchor = current ? current.startMin : elapsedMinutes;
    const earlier = stepStarts.filter((start) => start < anchor - 1 / 60).pop();
    if (earlier !== undefined) return earlier;
    // Première étape : on la reprend depuis son début.
    return current && elapsedMinutes - current.startMin > 3 / 60 ? current.startMin : null;
  }, [isActive, currentDisplay, elapsedMinutes, stepStarts]);

  const goToNext = useCallback(() => {
    if (nextTarget !== null) seekTo(nextTarget);
  }, [nextTarget, seekTo]);
  const goToPrevious = useCallback(() => {
    if (previousTarget !== null) seekTo(previousTarget);
  }, [previousTarget, seekTo]);

  const startFromItem = useCallback((itemId: string): boolean => {
    const block = flatBlocks.find((candidate) => candidate.id === itemId);
    if (!block) return false;
    if (isActiveRef.current) {
      seekTo(block.startMin);
    } else {
      setManualStartedAt(new Date(Date.now() - block.startMin * 60000));
      setStoppedWindow(null);
      setPausedAt(null);
      setNow(new Date());
    }
    return true;
  }, [flatBlocks, seekTo]);

  const previousAudioState = useRef<{
    isActive: boolean;
    currentBlockId: string | null;
  }>({ isActive: false, currentBlockId: null });
  const soundsEnabledRef = useRef(soundsEnabled);
  soundsEnabledRef.current = soundsEnabled;

  useEffect(() => {
    const previous = previousAudioState.current;
    const currentBlockId = currentDisplay?.current?.id ?? null;
    previousAudioState.current = { isActive, currentBlockId };

    if (!soundsEnabled) return;

    let sound: string | null = null;
    // Play Mode has just started.
    if (isActive && !previous.isActive) {
      sound = '/assets/ding.mp3';
    // The current block has ended without another block to switch to.
    } else if (isActive && currentBlockId === null && previous.currentBlockId !== null) {
      sound = '/assets/success.mp3';
    // The current block's time is up and Play Mode switches to the next block.
    } else if (
      isActive &&
      currentBlockId !== null &&
      previous.currentBlockId !== null &&
      currentBlockId !== previous.currentBlockId
    ) {
      sound = '/assets/dingdong.mp3';
    // The automatically running session has reached its total duration.
    } else if (!isActive && previous.isActive && elapsedMinutes >= totalDuration) {
      sound = '/assets/success.mp3';
    }

    if (!sound) return;

    const audio = new Audio(withBase(sound));
    void audio
      .play()
      .then(() => {
        if (soundsEnabledRef.current) {
          setSoundPulse((pulse) => pulse + 1);
        }
      })
      .catch(() => {
        // Browsers may block playback when Play Mode starts automatically.
      });
  }, [currentDisplay, elapsedMinutes, isActive, soundsEnabled, totalDuration]);

  return {
    isActive,
    currentDisplay,
    blockPlayStates,
    // Surface the total elapsed minutes (clamped) so consumers like the time-
    // visualization strip can show a "current position" marker even when no
    // specific block is active (e.g. between blocks during a fixedStartTime gap).
    elapsedMinutes: isActive ? Math.max(0, elapsedMinutes) : 0,
    elapsedInCurrentBlock,
    currentBlockEffectiveDuration,
    soundPulse,
    isPaused: pausedAt !== null,
    pause,
    resume,
    togglePause,
    canGoNext: nextTarget !== null,
    canGoPrevious: previousTarget !== null,
    goToNext,
    goToPrevious,
    startFromItem,
    getElapsedMinutes,
    activate,
    deactivate,
  };
}
