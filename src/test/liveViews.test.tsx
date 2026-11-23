import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LiveFocusView } from '@/modules/planner/live/LiveFocusView';
import { LiveFloatingCell } from '@/modules/planner/live/LiveFloatingCell';
import type { LiveViewProps } from '@/modules/planner/live/liveProps';
import type { FlatBlock } from '@/lib/playModeUtils';
import type { WorkshopItem } from '@/types/workshop';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string, vars?: Record<string, string | number>) => (vars ? `${key} ${JSON.stringify(vars)}` : key),
    i18n: { language: 'fr' },
  }),
}));

const flat = (id: string, title: string, startMin: number, endMin: number): FlatBlock => ({ id, title, startMin, endMin, type: 'block' });
const item = (over: Partial<WorkshopItem>): WorkshopItem => ({
  id: 'b1', type: 'block', blockTypeId: 'input', title: 'Accueil', duration: 15, notes: '', material: '', ...over,
});

const current = item({
  objectives: '- Créer un climat',
  notes: 'Mot de bienvenue',
  material: '[x] Badges\n[ ] Marqueurs',
  location: 'Amphi A',
  room: 'Salle 12',
  layout: 'conference',
});
const next = item({ id: 'b2', title: 'Échange en sous-groupes', duration: 30 });

const baseProps = (over: Partial<LiveViewProps> = {}): LiveViewProps => ({
  dayLabel: null,
  display: {
    current: flat('b1', 'Accueil', 0, 15),
    next: flat('b2', 'Échange en sous-groupes', 15, 45),
    label: 'Accueil', prevLabel: null, nextLabel: 'Échange en sous-groupes',
  },
  getElapsedMinutes: () => 5,
  currentItem: current,
  currentType: { id: 'input', name: 'Apport', color: '#004C8E' },
  parentTitle: 'Partie 1',
  nextItem: next,
  nextType: { id: 'discussion', name: 'Discussion', color: '#41C8F4' },
  persons: [],
  soundsEnabled: true,
  soundPulse: 0,
  onToggleSounds: vi.fn(),
  onExtend: vi.fn(),
  onStop: vi.fn(),
  onUpdateItem: vi.fn(),
  ...over,
});

beforeEach(() => vi.useFakeTimers({ now: new Date(2026, 10, 24, 9, 5, 0) }));
afterEach(() => { cleanup(); vi.useRealTimers(); localStorage.clear(); });

describe('LiveFocusView', () => {
  it('shows the running item with a per-second countdown and its container', () => {
    render(<LiveFocusView {...baseProps()} onMinimize={() => {}} />);
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Accueil');
    expect(screen.getByText('Partie 1')).toBeTruthy();
    // 5 of 15 minutes elapsed: 10 minutes left.
    expect(screen.getByRole('timer').textContent).toContain('10:00');
  });

  it('lists every part of the item sheet, in reading order', () => {
    render(<LiveFocusView {...baseProps()} onMinimize={() => {}} />);
    const sheet = screen.getByTestId('live-sheet');
    const labels = [...sheet.querySelectorAll('section')].map((s) => s.getAttribute('aria-label'));
    expect(labels).toEqual(['dialog.objectives', 'dialog.notes', 'dialog.material', 'live.placeSection']);
    expect(sheet.textContent).toContain('Amphi A');
    expect(sheet.textContent).toContain('Salle 12');
    expect(sheet.textContent).toContain('layouts.conference');
  });

  it('ticks the material from the live view', () => {
    const onUpdateItem = vi.fn();
    render(<LiveFocusView {...baseProps({ onUpdateItem })} onMinimize={() => {}} />);
    fireEvent.click(screen.getAllByRole('checkbox')[1]);
    expect(onUpdateItem).toHaveBeenCalledWith('b1', { material: '[x] Badges\n[x] Marqueurs' });
  });

  it('previews the next item with its start time', () => {
    render(<LiveFocusView {...baseProps()} onMinimize={() => {}} />);
    const footer = screen.getByRole('contentinfo');
    expect(footer.textContent).toContain('Échange en sous-groupes');
    expect(footer.textContent).toContain('09:15');
    expect(footer.textContent).toContain('30');
  });

  it('counts down as time goes by', () => {
    let elapsed = 5;
    render(<LiveFocusView {...baseProps({ getElapsedMinutes: () => elapsed })} onMinimize={() => {}} />);
    elapsed = 5 + 90 / 60;
    act(() => { vi.advanceTimersByTime(1000); });
    expect(screen.getByRole('timer').textContent).toContain('08:30');
  });

  it('minimises on Escape and exposes minimise and stop buttons', () => {
    const onMinimize = vi.fn();
    const onStop = vi.fn();
    render(<LiveFocusView {...baseProps({ onStop })} onMinimize={onMinimize} />);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onMinimize).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTitle('playMode.stop'));
    expect(onStop).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTitle('live.minimize'));
    expect(onMinimize).toHaveBeenCalledTimes(2);
  });

  it('extends the running item by five minutes', () => {
    const onExtend = vi.fn();
    render(<LiveFocusView {...baseProps({ onExtend })} onMinimize={() => {}} />);
    fireEvent.click(screen.getByTitle('playMode.extend5Min'));
    expect(onExtend).toHaveBeenCalled();
  });

  it('waits for the next item between two items, previewing its sheet', () => {
    const props = baseProps({
      display: { current: null, next: flat('b2', 'Échange en sous-groupes', 15, 45), label: null, prevLabel: null, nextLabel: null },
      currentItem: null,
      nextItem: item({ id: 'b2', title: 'Échange en sous-groupes', notes: 'Consigne à venir' }),
    });
    render(<LiveFocusView {...props} onMinimize={() => {}} />);
    expect(screen.getByText('live.waiting')).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Échange en sous-groupes');
    expect(screen.getByRole('timer').textContent).toContain('10:00');
    expect(screen.getByTestId('live-sheet').textContent).toContain('Consigne à venir');
  });

  it('shows the end of the session with a way to close the live mode', () => {
    const onStop = vi.fn();
    const props = baseProps({
      display: { current: null, next: null, label: null, prevLabel: 'Accueil', nextLabel: null },
      currentItem: null, nextItem: null, onStop,
    });
    render(<LiveFocusView {...props} onMinimize={() => {}} />);
    expect(screen.getByText('playMode.sessionEnded')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'live.closeLive' }));
    expect(onStop).toHaveBeenCalled();
  });

  it('says so when an item has no sheet content', () => {
    render(<LiveFocusView {...baseProps({ currentItem: item({}) })} onMinimize={() => {}} />);
    expect(screen.getByText('live.sheetEmpty')).toBeTruthy();
  });
});

describe('LiveFloatingCell', () => {
  it('shows the title, the time left and the title of the next step only', () => {
    render(<LiveFloatingCell {...baseProps()} onExpand={() => {}} />);
    const cell = screen.getByTestId('live-floating-cell');
    expect(cell.textContent).toContain('Accueil');
    expect(cell.textContent).toContain('10:00');
    expect(cell.textContent).toContain('Échange en sous-groupes');
    // No sheet content in the compact cell.
    expect(cell.textContent).not.toContain('Mot de bienvenue');
    expect(screen.getByRole('progressbar', { name: 'live.remaining' }).getAttribute('aria-valuenow')).toBe('67');
  });

  it('expands back to the full view and stops the live mode', () => {
    const onExpand = vi.fn();
    const onStop = vi.fn();
    render(<LiveFloatingCell {...baseProps({ onStop })} onExpand={onExpand} />);
    fireEvent.click(screen.getByTitle('live.expand'));
    expect(onExpand).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTitle('playMode.stop'));
    expect(onStop).toHaveBeenCalledTimes(1);
  });

  it('moves with the arrow keys, stays on screen and remembers its position', () => {
    render(<LiveFloatingCell {...baseProps()} onExpand={() => {}} />);
    const cell = screen.getByTestId('live-floating-cell');
    const handle = screen.getByRole('group', { name: 'live.dragHandle' });
    const startLeft = parseFloat(cell.style.left);
    fireEvent.keyDown(handle, { key: 'ArrowLeft' });
    expect(parseFloat(cell.style.left)).toBe(startLeft - 16);
    fireEvent.keyDown(handle, { key: 'ArrowUp', shiftKey: true });
    expect(parseFloat(cell.style.top)).toBeGreaterThanOrEqual(8);
    const stored = JSON.parse(localStorage.getItem('sp:live-cell-position') ?? 'null');
    expect(stored).toEqual({ x: parseFloat(cell.style.left), y: parseFloat(cell.style.top) });
  });

  it('reopens where it was left', () => {
    localStorage.setItem('sp:live-cell-position', JSON.stringify({ x: 40, y: 60 }));
    render(<LiveFloatingCell {...baseProps()} onExpand={() => {}} />);
    const cell = screen.getByTestId('live-floating-cell');
    expect(cell.style.left).toBe('40px');
    expect(cell.style.top).toBe('60px');
  });
});
