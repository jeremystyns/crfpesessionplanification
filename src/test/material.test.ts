import { describe, expect, it } from 'vitest';
import {
  cleanMaterial,
  countMaterial,
  materialToPlainText,
  parseMaterial,
  serializeMaterial,
} from '@/lib/material';

describe('material checklist', () => {
  it('reads ready and pending entries, one per line', () => {
    expect(parseMaterial('[x] Badges\n[ ] Marqueurs')).toEqual([
      { done: true, text: 'Badges' },
      { done: false, text: 'Marqueurs' },
    ]);
  });

  it('reads plain legacy text lines as pending entries', () => {
    expect(parseMaterial('Paperboards\n\nFeutres')).toEqual([
      { done: false, text: 'Paperboards' },
      { done: false, text: 'Feutres' },
    ]);
  });

  it('accepts markdown task-list bullets and an upper-case X', () => {
    expect(parseMaterial('- [X] Ciseaux\n* [ ] Colle')).toEqual([
      { done: true, text: 'Ciseaux' },
      { done: false, text: 'Colle' },
    ]);
  });

  it('round-trips through serializeMaterial', () => {
    const value = '[x] Badges\n[ ] Marqueurs';
    expect(serializeMaterial(parseMaterial(value))).toBe(value);
  });

  it('keeps a freshly added blank entry while editing but drops it when cleaned', () => {
    const value = serializeMaterial([...parseMaterial('[ ] Badges'), { done: false, text: '' }]);
    expect(parseMaterial(value)).toHaveLength(2);
    expect(cleanMaterial(value)).toBe('[ ] Badges');
  });

  it('counts ready entries against the total', () => {
    expect(countMaterial('[x] A\n[x] B\n[ ] C\n[ ] ')).toEqual({ ready: 2, total: 3 });
    expect(countMaterial('')).toEqual({ ready: 0, total: 0 });
  });

  it('exports a plain text list with a tick in front of ready material', () => {
    expect(materialToPlainText('[x] Badges\n[ ] Marqueurs')).toBe('✓ Badges\nMarqueurs');
  });
});
