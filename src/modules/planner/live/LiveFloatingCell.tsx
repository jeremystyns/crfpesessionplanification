/**
 * LiveFloatingCell — Version réduite du mode Live : une cellule flottante,
 * déplaçable (souris, doigt ou flèches du clavier), qui montre le titre de
 * l'élément en cours, le temps restant de façon visuelle (barre qui se vide et
 * compte à rebours) et le titre de la prochaine étape. Elle laisse consulter la
 * chronologie derrière. Sa position est mémorisée.
 * Used by: WorkshopPlanner
 */
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, ClockPlus, GripVertical, Maximize2, Radio, Square } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { useLiveClock } from '@/hooks/useLiveClock';
import { useTypeTitleColor } from '@/hooks/useTypeTitleColor';
import { clampToViewport, formatCountdown, type Point } from '@/lib/liveFocus';
import { STORAGE_KEYS } from '@/lib/storageKeys';
import { cn } from '@/lib/utils';
import { PRESSURE_BAR, PRESSURE_TEXT } from './LiveFocusView';
import type { LiveViewProps } from './liveProps';

interface LiveFloatingCellProps extends LiveViewProps {
  onExpand: () => void;
}

const MARGIN = 12;
const KEY_STEP = 16;

const readStoredPosition = (): Point | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.LIVE_CELL_POSITION);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<Point>;
    return typeof parsed.x === 'number' && typeof parsed.y === 'number' ? { x: parsed.x, y: parsed.y } : null;
  } catch {
    return null;
  }
};

const storePosition = (position: Point) => {
  try {
    localStorage.setItem(STORAGE_KEYS.LIVE_CELL_POSITION, JSON.stringify(position));
  } catch {
    // Stockage indisponible : la position ne sera simplement pas mémorisée.
  }
};

export const LiveFloatingCell = ({
  dayLabel,
  display,
  getElapsedMinutes,
  currentItem,
  currentType,
  nextItem,
  onExtend,
  onStop,
  onExpand,
}: LiveFloatingCellProps) => {
  const { t } = useTranslation('common');
  const clock = useLiveClock(display, getElapsedMinutes);
  const titleColor = useTypeTitleColor(currentType?.color);
  const cellRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Point | null>(null);
  const drag = useRef<{ pointerId: number; dx: number; dy: number } | null>(null);

  const viewport = () => ({ width: window.innerWidth, height: window.innerHeight });
  const sizeOf = () => {
    const rect = cellRef.current?.getBoundingClientRect();
    return { width: rect?.width ?? 304, height: rect?.height ?? 160 };
  };
  const clamp = useCallback(
    (point: Point) => clampToViewport(point, sizeOf(), viewport(), MARGIN),
    [],
  );

  // Position initiale : celle mémorisée, sinon le coin inférieur droit.
  useLayoutEffect(() => {
    const size = sizeOf();
    const initial = readStoredPosition() ?? {
      x: window.innerWidth - size.width - MARGIN,
      y: window.innerHeight - size.height - MARGIN,
    };
    setPosition(clampToViewport(initial, size, viewport(), MARGIN));
  }, []);

  // La fenêtre change de taille : la cellule reste visible.
  useEffect(() => {
    const onResize = () => setPosition((prev) => (prev ? clamp(prev) : prev));
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [clamp]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || !position) return;
    // Les boutons de l'en-tête gardent leur clic.
    if ((event.target as HTMLElement).closest('button')) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { pointerId: event.pointerId, dx: event.clientX - position.x, dy: event.clientY - position.y };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    setPosition(clamp({ x: event.clientX - state.dx, y: event.clientY - state.dy }));
  };
  const endDrag = (event: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId !== event.pointerId) return;
    drag.current = null;
    if (position) storePosition(position);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? KEY_STEP * 4 : KEY_STEP;
    const delta: Record<string, Point> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const move = delta[event.key];
    if (!move || !position) return;
    event.preventDefault();
    const next = clamp({ x: position.x + move.x, y: position.y + move.y });
    setPosition(next);
    storePosition(next);
  };

  const { mode, pressure } = clock;
  const running = mode === 'running';
  const title = running ? currentItem?.title ?? display.label ?? '' : mode === 'waiting' ? display.next?.title ?? '' : t('playMode.sessionEnded');
  const remainingPct = running ? Math.round((1 - clock.progress) * 100) : mode === 'ended' ? 0 : 100;
  const countdown = running ? clock.remainingSeconds : clock.untilNextSeconds ?? 0;
  const nextTitle = running ? (nextItem?.title ?? display.next?.title ?? null) : null;

  return (
    <div
      ref={cellRef}
      role="region"
      aria-label={t('live.floatingCell')}
      data-testid="live-floating-cell"
      style={{ left: position?.x ?? 0, top: position?.y ?? 0, visibility: position ? 'visible' : 'hidden' }}
      className="fixed z-[55] w-[19rem] max-w-[calc(100vw-1.5rem)] select-none overflow-hidden rounded-xl border bg-card text-card-foreground shadow-2xl print:hidden"
    >
      {/* Poignée : on la saisit pour déplacer la cellule */}
      <div
        tabIndex={0}
        role="group"
        aria-label={t('live.dragHandle')}
        title={t('live.dragHandle')}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onKeyDown={onKeyDown}
        className="flex cursor-grab touch-none items-center gap-1.5 bg-primary px-1.5 py-1 text-primary-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring active:cursor-grabbing"
      >
        <GripVertical className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
        <Radio className="h-3.5 w-3.5 shrink-0 animate-pulse" aria-hidden />
        <span className="text-[11px] font-bold uppercase tracking-wide">{t('live.badge')}</span>
        {dayLabel && <span className="truncate rounded-full bg-primary-foreground/20 px-1.5 text-[11px]">{dayLabel}</span>}
        <span className="ml-auto flex items-center">
          {running && (
            <Button variant="ghost" size="icon" onClick={onExtend}
              className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
              title={t('playMode.extend5Min')} aria-label={t('playMode.extend5Min')}>
              <ClockPlus className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onExpand}
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
            title={t('live.expand')} aria-label={t('live.expand')}>
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onStop}
            className="h-7 w-7 text-primary-foreground hover:bg-primary-foreground/20 hover:text-primary-foreground"
            title={t('playMode.stop')} aria-label={t('playMode.stop')}>
            <Square className="h-3.5 w-3.5" />
          </Button>
        </span>
      </div>

      <div className="space-y-2 px-3 pb-3 pt-2.5">
        <p
          className="line-clamp-2 text-base font-bold leading-snug"
          style={titleColor && running ? { color: titleColor } : undefined}
          title={title}
        >
          {title}
        </p>

        {mode !== 'ended' && (
          <div role="timer" aria-live="off">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {t(running ? 'live.remaining' : 'live.startsIn')}
              </span>
              <span className={cn('text-3xl font-extrabold tabular-nums leading-none', PRESSURE_TEXT[pressure],
                pressure === 'critical' && 'animate-pulse')}>
                {formatCountdown(countdown)}
              </span>
            </div>
            {/* Temps restant : la barre se vide au fil des secondes */}
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-primary/15"
              role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={remainingPct} aria-label={t('live.remaining')}>
              <div className={cn('h-full rounded-full transition-[width] duration-1000 ease-linear', PRESSURE_BAR[pressure])}
                style={{ width: `${remainingPct}%` }} />
            </div>
          </div>
        )}

        {nextTitle && (
          <p className="flex items-center gap-1 border-t pt-2 text-xs text-muted-foreground">
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-primary-text" aria-hidden />
            <span className="shrink-0 font-semibold uppercase tracking-wide">{t('live.next')}</span>
            <span className="truncate font-medium text-foreground" title={nextTitle}>{nextTitle}</span>
          </p>
        )}
      </div>
    </div>
  );
};
