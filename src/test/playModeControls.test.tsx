import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePlayMode } from '@/hooks/usePlayMode';
import { LiveStartContext } from '@/contexts/LiveStartContext';
import { LiveStartButton } from '@/modules/timeline/atoms/LiveStartButton';
import { createEmptyWorkshop, WorkshopData, WorkshopItem } from '@/types/workshop';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key }),
}));

const block = (id: string, duration: number, extra: Partial<WorkshopItem> = {}): WorkshopItem => ({
  id, type: 'block', blockTypeId: null, title: id, duration, notes: '', material: '', ...extra,
});

// a: 0-10, group g: 10-40 (b: 10-25, c: 25-40), d: 40-50
const plan = (): WorkshopData => ({
  ...createEmptyWorkshop(),
  workshop: { title: 'T', description: '', date: '2026-10-12', startTime: '09:00' },
  items: [
    block('a', 10),
    { ...block('g', 30), type: 'group', children: [block('b', 15), block('c', 15)] },
    block('d', 10),
  ],
});

const MINUTE = 60_000;
const NOW = new Date(2026, 9, 12, 8, 0, 0); // before the scheduled start: not auto-active

beforeEach(() => vi.useFakeTimers({ now: NOW }));
afterEach(() => { cleanup(); vi.useRealTimers(); });

const setup = () => renderHook(() => usePlayMode(plan(), 50, false));
const currentId = (hook: ReturnType<typeof setup>) => hook.result.current.currentDisplay?.current?.id;
const advance = (ms: number) => act(() => { vi.advanceTimersByTime(ms); });

describe('usePlayMode: pause', () => {
  it('freezes the elapsed time while paused and resumes where it stopped', () => {
    const hook = setup();
    act(() => hook.result.current.activate());
    advance(2 * MINUTE);
    expect(hook.result.current.getElapsedMinutes()).toBeCloseTo(2, 1);

    act(() => hook.result.current.pause());
    expect(hook.result.current.isPaused).toBe(true);
    advance(10 * MINUTE);
    expect(hook.result.current.getElapsedMinutes()).toBeCloseTo(2, 1);
    expect(currentId(hook)).toBe('a');

    act(() => hook.result.current.resume());
    expect(hook.result.current.isPaused).toBe(false);
    expect(hook.result.current.getElapsedMinutes()).toBeCloseTo(2, 1);
    advance(3 * MINUTE);
    expect(hook.result.current.getElapsedMinutes()).toBeCloseTo(5, 1);
  });

  it('toggles, ignores a pause when no live is running, and clears on stop', () => {
    const hook = setup();
    act(() => hook.result.current.pause());
    expect(hook.result.current.isPaused).toBe(false);

    act(() => hook.result.current.activate());
    act(() => hook.result.current.togglePause());
    expect(hook.result.current.isPaused).toBe(true);
    act(() => hook.result.current.deactivate());
    expect(hook.result.current.isPaused).toBe(false);
    expect(hook.result.current.isActive).toBe(false);
  });

  it('does not play a sound or change step while paused', () => {
    const hook = setup();
    act(() => hook.result.current.activate());
    act(() => hook.result.current.pause());
    advance(30 * MINUTE);
    expect(currentId(hook)).toBe('a');
  });
});

describe('usePlayMode: step navigation', () => {
  it('moves to the start of the next step, across a group', () => {
    const hook = setup();
    act(() => hook.result.current.activate());
    expect(currentId(hook)).toBe('a');
    expect(hook.result.current.canGoNext).toBe(true);

    act(() => hook.result.current.goToNext());
    expect(currentId(hook)).toBe('b');
    expect(hook.result.current.getElapsedMinutes()).toBeCloseTo(10, 1);
    act(() => hook.result.current.goToNext());
    expect(currentId(hook)).toBe('c');
    act(() => hook.result.current.goToNext());
    expect(currentId(hook)).toBe('d');
    // Last step: nothing after it.
    expect(hook.result.current.canGoNext).toBe(false);
  });

  it('goes back to the previous step, even when going on too fast', () => {
    const hook = setup();
    act(() => hook.result.current.activate());
    act(() => hook.result.current.goToNext());
    act(() => hook.result.current.goToNext());
    expect(currentId(hook)).toBe('c');
    act(() => hook.result.current.goToPrevious());
    expect(currentId(hook)).toBe('b');
    act(() => hook.result.current.goToPrevious());
    expect(currentId(hook)).toBe('a');
  });

  it('restarts the first step instead of going before it, and is disabled right at its start', () => {
    const hook = setup();
    act(() => hook.result.current.activate());
    expect(hook.result.current.canGoPrevious).toBe(false);
    advance(2 * MINUTE);
    expect(hook.result.current.canGoPrevious).toBe(true);
    act(() => hook.result.current.goToPrevious());
    expect(currentId(hook)).toBe('a');
    expect(hook.result.current.getElapsedMinutes()).toBeCloseTo(0, 1);
  });

  it('keeps the pause while changing step', () => {
    const hook = setup();
    act(() => hook.result.current.activate());
    act(() => hook.result.current.pause());
    act(() => hook.result.current.goToNext());
    expect(hook.result.current.isPaused).toBe(true);
    expect(currentId(hook)).toBe('b');
    advance(5 * MINUTE);
    expect(currentId(hook)).toBe('b');
    expect(hook.result.current.getElapsedMinutes()).toBeCloseTo(10, 1);
  });

  it('offers no step navigation when the live is not running', () => {
    const hook = setup();
    expect(hook.result.current.canGoNext).toBe(false);
    expect(hook.result.current.canGoPrevious).toBe(false);
  });
});

describe('usePlayMode: start from an item', () => {
  it('starts the live at the chosen item', () => {
    const hook = setup();
    let found = false;
    act(() => { found = hook.result.current.startFromItem('c'); });
    expect(found).toBe(true);
    expect(hook.result.current.isActive).toBe(true);
    expect(currentId(hook)).toBe('c');
    expect(hook.result.current.getElapsedMinutes()).toBeCloseTo(25, 1);
  });

  it('can start at a group, and refuses an unknown item', () => {
    const hook = setup();
    act(() => { hook.result.current.startFromItem('g'); });
    expect(hook.result.current.getElapsedMinutes()).toBeCloseTo(10, 1);
    expect(currentId(hook)).toBe('b');
    let found = true;
    act(() => { found = hook.result.current.startFromItem('nope'); });
    expect(found).toBe(false);
  });

  it('jumps to another item when the live already runs, keeping the pause', () => {
    const hook = setup();
    act(() => hook.result.current.activate());
    act(() => hook.result.current.pause());
    act(() => { hook.result.current.startFromItem('d'); });
    expect(currentId(hook)).toBe('d');
    expect(hook.result.current.isPaused).toBe(true);
  });
});

describe('LiveStartButton', () => {
  it('renders nothing without a live provider', () => {
    const { container } = render(<LiveStartButton itemId="a" />);
    expect(container.firstChild).toBeNull();
  });

  it('starts the live from its item, without opening the card', () => {
    const startFrom = vi.fn();
    const outer = vi.fn();
    render(
      <LiveStartContext.Provider value={{ isLive: false, startFrom }}>
        <div onClick={outer}><LiveStartButton itemId="b2" /></div>
      </LiveStartContext.Provider>,
    );
    fireEvent.click(screen.getByTitle('live.startHere'));
    expect(startFrom).toHaveBeenCalledWith('b2');
    expect(outer).not.toHaveBeenCalled();
  });

  it('offers to jump there once the live runs', () => {
    render(
      <LiveStartContext.Provider value={{ isLive: true, startFrom: () => {} }}>
        <LiveStartButton itemId="b2" />
      </LiveStartContext.Provider>,
    );
    expect(screen.getByTitle('live.goHere')).toBeTruthy();
  });
});
