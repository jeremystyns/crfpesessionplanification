import { describe, expect, it } from 'vitest';
import {
  clampToViewport,
  clockTimeAfter,
  findAncestorTitles,
  formatCountdown,
  getProgress,
  getTimePressure,
} from '@/lib/liveFocus';

describe('formatCountdown', () => {
  it('shows minutes and seconds, rounding partial seconds up', () => {
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(59.2)).toBe('01:00');
    expect(formatCountdown(14 * 60 + 58)).toBe('14:58');
  });

  it('adds hours past 60 minutes and never goes negative', () => {
    expect(formatCountdown(3725)).toBe('1:02:05');
    expect(formatCountdown(-5)).toBe('00:00');
  });
});

describe('getTimePressure', () => {
  it('turns orange then red as the end approaches', () => {
    expect(getTimePressure(600, 900)).toBe('normal');
    expect(getTimePressure(110, 900)).toBe('warning');
    expect(getTimePressure(25, 900)).toBe('critical');
  });

  it('uses a quarter of the time on short items', () => {
    // 4 minutes: warning from 60 s (25 %), not from 120 s.
    expect(getTimePressure(100, 240)).toBe('normal');
    expect(getTimePressure(60, 240)).toBe('warning');
  });

  it('keeps one-minute items calm', () => {
    expect(getTimePressure(10, 60)).toBe('normal');
  });
});

describe('getProgress', () => {
  it('stays between 0 and 1', () => {
    expect(getProgress(30, 60)).toBe(0.5);
    expect(getProgress(90, 60)).toBe(1);
    expect(getProgress(-1, 60)).toBe(0);
    expect(getProgress(5, 0)).toBe(0);
  });
});

describe('clockTimeAfter', () => {
  it('formats the wall-clock time some seconds from now', () => {
    const now = new Date(2026, 10, 24, 9, 0, 0).getTime();
    expect(clockTimeAfter(now, 15 * 60, 'fr-FR')).toBe('09:15');
    expect(clockTimeAfter(now, -30 * 60, 'fr-FR')).toBe('08:30');
  });
});

describe('clampToViewport', () => {
  const size = { width: 300, height: 150 };
  const viewport = { width: 1000, height: 700 };

  it('keeps the cell inside the window with a margin', () => {
    expect(clampToViewport({ x: -50, y: -50 }, size, viewport, 10)).toEqual({ x: 10, y: 10 });
    expect(clampToViewport({ x: 5000, y: 5000 }, size, viewport, 10)).toEqual({ x: 690, y: 540 });
    expect(clampToViewport({ x: 100, y: 100 }, size, viewport, 10)).toEqual({ x: 100, y: 100 });
  });

  it('does not push the cell off-screen when the window is smaller than the cell', () => {
    expect(clampToViewport({ x: 50, y: 50 }, size, { width: 200, height: 100 }, 8)).toEqual({ x: 8, y: 8 });
  });
});

describe('findAncestorTitles', () => {
  const tree = [
    { id: 'a', title: 'Accueil' },
    {
      id: 'g', title: 'Partie 1',
      children: [{ id: 'b', title: 'Breakout', children: [{ id: 'c', title: 'Lane' }] }],
    },
  ];

  it('lists containers from the outermost to the closest', () => {
    expect(findAncestorTitles(tree, 'c')).toEqual(['Partie 1', 'Breakout']);
    expect(findAncestorTitles(tree, 'b')).toEqual(['Partie 1']);
  });

  it('returns an empty list for top-level items and null when absent', () => {
    expect(findAncestorTitles(tree, 'a')).toEqual([]);
    expect(findAncestorTitles(tree, 'zzz')).toBeNull();
  });
});
