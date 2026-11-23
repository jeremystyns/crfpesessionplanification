/**
 * LiveFocusView — Vue plein écran du mode Live : l'élément en cours, son
 * compte à rebours à la seconde (anneau + ligne qui défile en haut), sa fiche
 * ordonnée à droite, et un aperçu de l'élément suivant en bas. Les sons du
 * mode Live restent actifs. « Réduire » bascule en cellule flottante.
 * Used by: WorkshopPlanner
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, BellOff, CheckCircle2, ChevronRight, ClockPlus, Hourglass, Maximize, Minimize, Minimize2, Pause, Play, Radio, SkipBack, SkipForward, Square } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { useLiveClock, useSoundPulse } from '@/hooks/useLiveClock';
import { useTypeTitleColor } from '@/hooks/useTypeTitleColor';
import { clockTimeAfter, formatCountdown } from '@/lib/liveFocus';
import { getBlockTypeName } from '@/lib/workshopUtils';
import { cn } from '@/lib/utils';
import { LiveItemSheet } from './LiveItemSheet';
import type { LiveViewProps } from './liveProps';

export const PRESSURE_BAR = {
  normal: 'bg-primary',
  warning: 'bg-[#DC8319]',
  critical: 'bg-[#E75145]',
  paused: 'bg-muted-foreground/60',
} as const;

const PRESSURE_STROKE = {
  normal: 'stroke-primary',
  warning: 'stroke-[#DC8319]',
  critical: 'stroke-[#E75145]',
  paused: 'stroke-muted-foreground/60',
} as const;

export const PRESSURE_TEXT = {
  normal: 'text-[hsl(var(--content-text))]',
  warning: 'text-[#B86A0C] dark:text-[#F99D1D]',
  critical: 'text-[#C00000] dark:text-[#F3A59F]',
  paused: 'text-muted-foreground',
} as const;

interface LiveFocusViewProps extends LiveViewProps {
  onMinimize: () => void;
}

const RING_RADIUS = 88;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

export const LiveFocusView = ({
  dayLabel,
  display,
  getElapsedMinutes,
  currentItem,
  currentType,
  parentTitle,
  nextItem,
  nextType,
  persons,
  dayLocation,
  dayRoom,
  soundsEnabled,
  soundPulse,
  isPaused,
  onTogglePause,
  canPrevious,
  canNext,
  onPrevious,
  onNext,
  onToggleSounds,
  onExtend,
  onStop,
  onUpdateItem,
  onMinimize,
}: LiveFocusViewProps) => {
  const { t, i18n } = useTranslation('common');
  const clock = useLiveClock(display, getElapsedMinutes);
  const pulsing = useSoundPulse(soundPulse);
  const titleColor = useTypeTitleColor(currentType?.color);
  const nextColor = useTypeTitleColor(nextType?.color);
  const locale = i18n.language === 'en' ? 'en-GB' : 'fr-FR';

  // Échap réduit la vue (la touche quitte d'abord le plein écran du navigateur) ;
  // ← / → changent d'étape, Espace met en pause ou reprend.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement) {
        onMinimize();
        return;
      }
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target instanceof Element ? event.target : null;
      // Les flèches fonctionnent même après un clic sur un bouton ; elles restent au champ de saisie.
      if (target?.closest('input[type="text"], input:not([type]), textarea, select')) return;
      if (event.key === 'ArrowRight' && canNext) { event.preventDefault(); onNext(); }
      else if (event.key === 'ArrowLeft' && canPrevious) { event.preventDefault(); onPrevious(); }
      // Espace active déjà un bouton ou une case qui a le focus : on ne double pas l'action.
      else if (event.key === ' ' && !target?.closest('button, [role="checkbox"], a')) { event.preventDefault(); onTogglePause(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onMinimize, onNext, onPrevious, onTogglePause, canNext, canPrevious]);

  const [browserFullscreen, setBrowserFullscreen] = useState(false);
  useEffect(() => {
    const onChange = () => setBrowserFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      if (document.fullscreenElement) void document.exitFullscreen?.();
    };
  }, []);
  const toggleBrowserFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void document.documentElement.requestFullscreen?.().catch(() => undefined);
  };

  const { mode } = clock;
  // En pause, le compte à rebours est grisé : la couleur d'urgence ne s'applique plus.
  const pressure = isPaused ? 'paused' : clock.pressure;
  const sheetItem = mode === 'running' ? currentItem : mode === 'waiting' ? nextItem : null;
  const waitingFor = mode === 'waiting' ? display.next : null;
  const title = mode === 'running' ? currentItem?.title ?? display.label ?? '' : waitingFor?.title ?? '';
  const progressPct = `${Math.round(clock.progress * 100)}%`;
  // L'anneau se vide au fil du temps : plein au début, vide à la fin.
  const ringOffset = RING_LENGTH * (mode === 'running' ? clock.progress : 0);
  const countdownSeconds = mode === 'running' ? clock.remainingSeconds : clock.untilNextSeconds ?? 0;

  const nowClock = new Date(clock.nowMs).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const startClock = clockTimeAfter(clock.nowMs, -clock.elapsedSeconds, locale);
  const endClock = clockTimeAfter(clock.nowMs, clock.remainingSeconds, locale);
  const nextClock = clock.untilNextSeconds !== null ? clockTimeAfter(clock.nowMs, clock.untilNextSeconds, locale) : null;

  const iconButton = 'h-9 w-9';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('live.title')}
      data-testid="live-focus-view"
      className="fixed inset-0 z-[60] flex flex-col bg-background text-foreground print:hidden"
    >
      {/* La ligne qui défile : avancement de l'élément en cours */}
      <div className="h-2.5 w-full shrink-0 bg-primary/15" role="progressbar" aria-valuemin={0} aria-valuemax={100}
        aria-valuenow={Math.round(clock.progress * 100)} aria-label={t('live.progress')}>
        <div
          className={cn('h-full transition-[width] duration-1000 ease-linear', PRESSURE_BAR[pressure])}
          style={{ width: mode === 'ended' ? '100%' : progressPct }}
        />
      </div>

      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b px-4 py-2 sm:px-8">
        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide',
          isPaused ? 'bg-[#DC8319]/15 text-[#8A4F00] dark:text-[#F99D1D]' : 'bg-primary/10 text-primary-text')}>
          {isPaused ? <Pause className="h-3.5 w-3.5" aria-hidden /> : <Radio className="h-3.5 w-3.5 animate-pulse" aria-hidden />}
          {t(isPaused ? 'live.paused' : 'live.badge')}
        </span>
        {dayLabel && (
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{dayLabel}</span>
        )}
        <span className="text-sm font-medium tabular-nums text-muted-foreground" title={t('live.clock')}>{nowClock}</span>

        <div className="ml-auto flex flex-wrap items-center gap-1.5">
          {/* Étape précédente · pause · étape suivante */}
          <div className="flex items-center gap-1 rounded-lg border bg-card p-0.5" role="group" aria-label={t('live.stepControls')}>
            <Button variant="ghost" size="icon" className={iconButton} onClick={onPrevious} disabled={!canPrevious}
              title={t('live.previous')} aria-label={t('live.previous')}>
              <SkipBack className="h-4 w-4" />
            </Button>
            {mode !== 'ended' && (
              <Button variant={isPaused ? 'default' : 'ghost'} size="sm" className="h-9 gap-1.5 px-3" onClick={onTogglePause}
                title={t(isPaused ? 'live.resume' : 'live.pause')} aria-pressed={isPaused}>
                {isPaused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
                <span className="hidden sm:inline">{t(isPaused ? 'live.resumeShort' : 'live.pauseShort')}</span>
              </Button>
            )}
            <Button variant="ghost" size="icon" className={iconButton} onClick={onNext} disabled={!canNext}
              title={t('live.nextStep')} aria-label={t('live.nextStep')}>
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSounds}
            className={cn(iconButton, 'transition-colors', pulsing && 'bg-primary/20 text-primary-text')}
            title={t(soundsEnabled ? 'playMode.disableSounds' : 'playMode.enableSounds')}
            aria-label={t(soundsEnabled ? 'playMode.disableSounds' : 'playMode.enableSounds')}
            aria-pressed={soundsEnabled}
          >
            {soundsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
          </Button>
          {mode === 'running' && (
            <Button variant="outline" size="sm" onClick={onExtend} className="h-9 gap-1.5" title={t('playMode.extend5Min')}>
              <ClockPlus className="h-4 w-4" />
              5 {t('planner.totalMin')}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleBrowserFullscreen}
            className={cn(iconButton, 'hidden sm:inline-flex')}
            title={t(browserFullscreen ? 'live.exitFullscreen' : 'live.fullscreen')}
            aria-label={t(browserFullscreen ? 'live.exitFullscreen' : 'live.fullscreen')}
          >
            {browserFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </Button>
          <Button variant="secondary" size="sm" onClick={onMinimize} className="h-9 gap-1.5" title={t('live.minimize')}>
            <Minimize2 className="h-4 w-4" />
            <span className="hidden sm:inline">{t('live.minimizeShort')}</span>
          </Button>
          <Button variant="outline" size="sm" onClick={onStop}
            className="h-9 gap-1.5 text-destructive-text hover:text-destructive-text" title={t('playMode.stop')}>
            <Square className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('live.stopShort')}</span>
          </Button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 gap-8 overflow-y-auto p-4 sm:p-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* Colonne de gauche : titre et compte à rebours */}
        <section className="flex flex-col items-center gap-6 text-center lg:sticky lg:top-0 lg:self-start">
          {mode === 'ended' ? (
            <div className="flex flex-col items-center gap-4 py-10">
              <CheckCircle2 className="h-16 w-16 text-primary-text" aria-hidden />
              <h1 className="text-4xl font-extrabold">{t('playMode.sessionEnded')}</h1>
              <p className="text-lg text-muted-foreground">{t('live.endedHint')}</p>
              <Button size="lg" onClick={onStop}>{t('live.closeLive')}</Button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {mode === 'waiting' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-semibold">
                    <Hourglass className="h-4 w-4" aria-hidden />
                    {t('live.waiting')}
                  </span>
                )}
                {parentTitle && mode === 'running' && (
                  <span className="rounded-full bg-muted px-3 py-1 text-sm font-medium text-muted-foreground">{parentTitle}</span>
                )}
                {currentType && mode === 'running' && (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm font-medium">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: currentType.color }} aria-hidden />
                    {getBlockTypeName(currentType, t)}
                  </span>
                )}
              </div>

              <h1
                className="text-balance text-3xl font-extrabold leading-tight sm:text-4xl xl:text-5xl"
                style={titleColor && mode === 'running' ? { color: titleColor } : undefined}
              >
                {title}
              </h1>

              <div className="relative aspect-square w-[min(72vw,22rem)]" role="timer" aria-live="off">
                <svg viewBox="0 0 200 200" className="h-full w-full -rotate-90" aria-hidden>
                  <circle cx="100" cy="100" r={RING_RADIUS} fill="none" strokeWidth="12" className="stroke-primary/15" />
                  <circle
                    cx="100" cy="100" r={RING_RADIUS} fill="none" strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={RING_LENGTH} strokeDashoffset={ringOffset}
                    className={cn('transition-[stroke-dashoffset] duration-1000 ease-linear', PRESSURE_STROKE[pressure])}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {t(mode === 'running' ? 'live.remaining' : 'live.startsIn')}
                  </span>
                  <span className={cn('text-6xl font-extrabold tabular-nums leading-none sm:text-7xl', PRESSURE_TEXT[pressure],
                    pressure === 'critical' && 'animate-pulse')}>
                    {formatCountdown(countdownSeconds)}
                  </span>
                  {isPaused ? (
                    <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-[#DC8319]/15 px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-[#8A4F00] dark:text-[#F99D1D]">
                      <Pause className="h-3 w-3" aria-hidden />
                      {t('live.paused')}
                    </span>
                  ) : mode === 'running' && (
                    <span className="mt-2 text-sm tabular-nums text-muted-foreground">
                      {t('live.range', { start: startClock, end: endClock })}
                    </span>
                  )}
                  {mode === 'waiting' && nextClock && (
                    <span className="mt-2 text-sm tabular-nums text-muted-foreground">{t('live.startsAt', { time: nextClock })}</span>
                  )}
                </div>
              </div>
            </>
          )}
        </section>

        {/* Colonne de droite : la fiche de l'élément */}
        {mode !== 'ended' && (
          <section aria-label={t('live.sheet')} className="min-w-0 rounded-xl border bg-card p-5 shadow-sm sm:p-6">
            {sheetItem ? (
              <LiveItemSheet
                item={sheetItem}
                persons={persons}
                fallbackLocation={dayLocation}
                fallbackRoom={dayRoom}
                onUpdateItem={onUpdateItem}
              />
            ) : (
              <p className="text-lg text-muted-foreground">{t('live.sheetEmpty')}</p>
            )}
          </section>
        )}
      </main>

      {/* Aperçu de l'élément suivant */}
      {mode === 'running' && (
        <footer className="shrink-0 border-t bg-muted/40 px-4 py-3 sm:px-8" aria-label={t('live.next')}>
          {display.next ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-[hsl(var(--content-subtitle))]">
                <ChevronRight className="h-4 w-4 text-primary-text" aria-hidden />
                {t('live.next')}
              </span>
              <span className="text-lg font-bold" style={nextColor ? { color: nextColor } : undefined}>
                {nextItem?.title ?? display.next.title}
              </span>
              {nextType && (
                <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: nextType.color }} aria-hidden />
                  {getBlockTypeName(nextType, t)}
                </span>
              )}
              <span className="ml-auto text-sm tabular-nums text-muted-foreground">
                {nextClock && t('live.startsAtIn', { time: nextClock, in: formatCountdown(clock.untilNextSeconds ?? 0) })}
                {clock.nextDurationMinutes !== null && ` · ${clock.nextDurationMinutes} ${t('planner.totalMin')}`}
              </span>
            </div>
          ) : (
            <p className="text-sm font-medium text-muted-foreground">{t('live.nextNone')}</p>
          )}
        </footer>
      )}
    </div>
  );
};
