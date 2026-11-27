import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import {
  findFormatRegions,
  getListKind,
  hasListSyntax,
  mapRenderedRangeToRaw,
  parseFormatting,
  renderRichText,
  toPlainText,
  tokenizeFormatting,
} from '@/lib/textFormatting';
import { readableOn, contrastRatio } from '@/lib/color-contrast';
import { toggleList, continueListOnEnter } from '@/lib/textFormattingActions';

const textareaWith = (value: string, start: number, end = start) => {
  const el = document.createElement('textarea');
  document.body.appendChild(el);
  el.value = value;
  el.setSelectionRange(start, end);
  return el;
};

describe('highlight ==text==', () => {
  it('renders as a yellow <mark> that stays readable', () => {
    const { container } = render(<>{parseFormatting('a ==cadre== b')}</>);
    const mark = container.querySelector('mark');
    expect(mark?.textContent).toBe('cadre');
    expect(mark?.className).toContain('bg-yellow-200');
    expect(mark?.className).toContain('text-neutral-900');
  });

  it('nests with bold', () => {
    const { container } = render(<>{parseFormatting('==un *mot* clé==')}</>);
    expect(container.querySelector('mark strong')?.textContent).toBe('mot');
  });

  it('tokenizes with two-character markers and keeps the text intact', () => {
    const tokens = tokenizeFormatting('a ==b== c');
    expect(tokens.map((t) => t.text).join('')).toBe('a ==b== c');
    expect(tokens.filter((t) => t.kind === 'marker').map((t) => t.text)).toEqual(['==', '==']);
    expect(tokens.find((t) => t.kind === 'highlight')?.text).toBe('b');
  });

  it('reports regions with the right content offsets', () => {
    expect(findFormatRegions('x ==abc== y')).toEqual([
      { kind: 'highlight', regionStart: 2, contentStart: 4, contentEnd: 7, regionEnd: 9, content: 'abc' },
    ]);
  });

  it('maps a selection in the preview back to the raw text, snapping to the markers', () => {
    // Rendered: "x abc y" ; selecting "abc" (2..5) covers the whole ==abc== region.
    expect(mapRenderedRangeToRaw('x ==abc== y', 2, 5)).toEqual({ start: 2, end: 9 });
  });
});

describe('lists', () => {
  it('recognises bullet and numbered lines', () => {
    expect(getListKind('- a')).toBe('bullets');
    expect(getListKind('• a')).toBe('bullets');
    expect(getListKind('12. a')).toBe('numbers');
    expect(getListKind('plain')).toBeNull();
    expect(hasListSyntax('a\n- b')).toBe(true);
    expect(hasListSyntax('a-b')).toBe(false);
  });

  it('renders real <ul> and <ol> lists around plain lines', () => {
    const { container } = render(<div>{renderRichText('Intro\n- un\n- deux\nFin\n1. a\n2. b')}</div>);
    expect(container.querySelectorAll('ul > li')).toHaveLength(2);
    expect(container.querySelectorAll('ol > li')).toHaveLength(2);
    expect(container.textContent).toContain('Intro');
    expect(container.textContent).toContain('Fin');
  });

  it('formats inside list items', () => {
    const { container } = render(<div>{renderRichText('- un *mot*')}</div>);
    expect(container.querySelector('li strong')?.textContent).toBe('mot');
  });

  it('is identical to parseFormatting when there is no list', () => {
    const { container: a } = render(<div>{renderRichText('a *b* c')}</div>);
    const { container: b } = render(<div>{parseFormatting('a *b* c')}</div>);
    expect(a.innerHTML).toBe(b.innerHTML);
  });

  it('keeps preview selections aligned with the raw text across list syntax', () => {
    // Rendered text: "intro" + "un" + "deux" = "introundeux" (no markers, no newlines around lists).
    const raw = 'intro\n- un\n- deux';
    const rendered = 'introundeux';
    const { start, end } = mapRenderedRangeToRaw(raw, rendered.indexOf('deux'), rendered.length);
    expect(raw.slice(start, end)).toBe('deux');
  });
});

describe('toggleList', () => {
  it('turns the selected lines into a bullet list and back', () => {
    const el = textareaWith('a\nb\nc', 0, 5);
    const added = toggleList(el, 'bullets');
    expect(added).toBe('- a\n- b\n- c');
    el.value = added as string;
    el.setSelectionRange(0, el.value.length);
    expect(toggleList(el, 'bullets')).toBe('a\nb\nc');
  });

  it('numbers lines and switches list type', () => {
    const el = textareaWith('- a\n- b', 0, 7);
    expect(toggleList(el, 'numbers')).toBe('1. a\n2. b');
  });

  it('only touches the line holding the caret', () => {
    const el = textareaWith('a\nb\nc', 2);
    expect(toggleList(el, 'bullets')).toBe('a\n- b\nc');
  });
});

describe('continueListOnEnter', () => {
  it('starts the next bullet, or the next number', () => {
    const bullet = textareaWith('- a', 3);
    expect(continueListOnEnter(bullet)).toEqual({ handled: true, result: '- a\n- ' });
    const numbered = textareaWith('1. a', 4);
    expect(continueListOnEnter(numbered)).toEqual({ handled: true, result: '1. a\n2. ' });
  });

  it('ends the list on an empty entry', () => {
    const el = textareaWith('- a\n- ', 6);
    expect(continueListOnEnter(el)).toEqual({ handled: true, result: '- a\n' });
  });

  it('leaves Enter alone outside a list', () => {
    expect(continueListOnEnter(textareaWith('abc', 3)).handled).toBe(false);
  });
});

describe('readableOn', () => {
  it('keeps a dark colour as is on white and darkens a light one', () => {
    expect(readableOn('#004C8E', '#ffffff')).toBe('#004c8e');
    const cyan = readableOn('#41C8F4', '#ffffff');
    const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
    expect(contrastRatio(rgb(cyan), [255, 255, 255])).toBeGreaterThanOrEqual(4.5);
    expect(cyan).not.toBe('#41c8f4');
  });

  it('lightens a dark colour on a dark surface', () => {
    const light = readableOn('#004C8E', '#12202e');
    const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
    expect(contrastRatio(rgb(light), rgb('#12202e'))).toBeGreaterThanOrEqual(4.5);
  });
});


describe('toPlainText', () => {
  it('removes every formatting mark, nested ones included', () => {
    expect(toPlainText('un *gras _et italique_* ==surligné==')).toBe('un gras et italique surligné');
  });

  it('spells out links, and keeps a bare address once', () => {
    expect(toPlainText('[la fiche](https://example.org/f)')).toBe('la fiche (https://example.org/f)');
    expect(toPlainText('[https://example.org](https://example.org)')).toBe('https://example.org');
  });

  it('turns bullets into • and keeps numbers', () => {
    expect(toPlainText('Intro\n- un *a*\n- deux\n1. premier')).toBe('Intro\n• un a\n• deux\n1. premier');
  });

  it('handles empty values and leaves plain text alone', () => {
    expect(toPlainText(undefined)).toBe('');
    expect(toPlainText('')).toBe('');
    expect(toPlainText('Rien à changer : 10 min.')).toBe('Rien à changer : 10 min.');
  });
});
