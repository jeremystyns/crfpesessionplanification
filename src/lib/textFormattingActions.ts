/**
 * textFormattingActions — DOM-level text manipulation shared by keyboard shortcuts
 * and toolbar buttons for the notes/material formatting syntax (*bold*, _italic_, [text](url)).
 *
 * Native undo integration
 * ------------------------
 * We use the deprecated-but-universally-supported
 * `document.execCommand('insertText', …)` technique so formatting changes
 * enter the BROWSER'S native undo stack inside the textarea — Ctrl/Cmd+Z
 * inside the field then reverts formatting exactly as it would for
 * normal typing. Without this, a controlled-component `onChange(newText)`
 * replacement would push formatting changes onto React's update flow but
 * leave the browser's per-textarea undo history unchanged; the user would
 * have to undo via a global app-level button (which only exists at the
 * workshop-snapshot granularity).
 *
 * Result contract
 * ---------------
 *  - `null` = applied natively via execCommand. The browser fired the
 *    `input` event synchronously during execCommand, so React's onChange
 *    handler has already propagated the new value to the parent. Callers
 *    MUST NOT call onChange again.
 *  - `string` = either (a) the new full text produced by the fallback
 *    path (callers MUST call onChange with it) or (b) the unchanged
 *    `textarea.value` for `insertLink`'s no-selection no-op (callers can
 *    detect this by reference equality and skip onChange).
 *
 * Flicker prevention
 * ------------------
 * On the fallback path we schedule the selection restore via
 * `setTimeout(0)`. Callers that need to refresh selection-derived state
 * after the apply (e.g. FormattedTextField's `hasSelection`) MUST also
 * use a `setTimeout(0)` and schedule it AFTER the action's — that
 * ordering ensures the state read happens against the freshly-restored
 * selection, not the stale pre-insert caret.
 */
import { FormatRegion, getListKind, getListPrefixLength, type ListKind } from './textFormatting';

/** Result of a formatting action. See file header for contract. */
export type FormattingActionResult = string | null;

const tryExecInsertText = (replacement: string): boolean => {
  if (typeof document === 'undefined' || typeof document.execCommand !== 'function') {
    return false;
  }
  try {
    return document.execCommand('insertText', false, replacement);
  } catch {
    return false;
  }
};

/**
 * Wraps the current selection (or inserts an empty marker pair at the
 * caret) with the given marker character. Returns `null` on the native
 * execCommand path (caller skips onChange) or the new full text on the
 * fallback path (caller calls onChange with it).
 */
export const wrapSelection = (
  textarea: HTMLTextAreaElement,
  marker: '*' | '_' | '==',
): FormattingActionResult => {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);
  const replacement = marker + selectedText + marker;

  // Some browsers (and jsdom) can have selectionStart/End drift between
  // the caller reading them and the actual selection state; re-assert the
  // range so execCommand acts on the exact characters we computed.
  if (textarea.selectionStart !== start || textarea.selectionEnd !== end) {
    textarea.setSelectionRange(start, end);
  }

  // Native undo path: execCommand inserts the replacement and fires an
  // input event synchronously (which propagates through React's onChange).
  // We then restore the selection around the freshly inserted text. The
  // input event handler that React invokes will see selectionStart/End as
  // the collapsed post-insert caret, so any state derived from selection
  // in handleChange must be deferred (setTimeout 0) — see the flicker
  // prevention note in the file header.
  if (tryExecInsertText(replacement)) {
    if (selectedText) {
      textarea.setSelectionRange(
        start + marker.length,
        start + marker.length + selectedText.length,
      );
    } else {
      textarea.setSelectionRange(start + marker.length, start + marker.length);
    }
    return null;
  }

  // Fallback path: caller will run onChange(newText). After React
  // re-renders the controlled value, restore the selection so the user
  // can keep typing.
  const newText =
    textarea.value.substring(0, start) +
    replacement +
    textarea.value.substring(end);

  setTimeout(() => {
    if (selectedText) {
      textarea.selectionStart = start + marker.length;
      textarea.selectionEnd = end + marker.length;
    } else {
      textarea.selectionStart = textarea.selectionEnd = start + marker.length;
    }
    textarea.focus();
  }, 0);

  return newText;
};

/**
 * Replaces the current selection with a markdown-style link `[text](url)`.
 *
 *  - Returns `null` on the native execCommand path (caller skips onChange).
 *  - Returns the new text on the fallback path (caller calls onChange).
 *  - Returns the unchanged `textarea.value` when nothing is selected so
 *    callers can detect the no-op (compare to current value) and skip
 *    onChange.
 */
export const insertLink = (
  textarea: HTMLTextAreaElement,
  url: string,
): FormattingActionResult => {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = textarea.value.substring(start, end);

  if (!selectedText) return textarea.value;

  const replacement = `[${selectedText}](${url})`;

  if (textarea.selectionStart !== start || textarea.selectionEnd !== end) {
    textarea.setSelectionRange(start, end);
  }

  if (tryExecInsertText(replacement)) {
    // Caret collapses just past the closing paren; 4 = '[', ']', '(', ')'.
    const caret = start + selectedText.length + url.length + 4;
    textarea.setSelectionRange(caret, caret);
    return null;
  }

  const newText =
    textarea.value.substring(0, start) +
    replacement +
    textarea.value.substring(end);

  setTimeout(() => {
    const caret = start + selectedText.length + url.length + 4;
    textarea.selectionStart = textarea.selectionEnd = caret;
    textarea.focus();
  }, 0);

  return newText;
};

/** Prompts the user for a URL to use when inserting a link. */
export const promptForLink = (): string | null => window.prompt('Adresse du lien (URL) :', 'https://');

/**
 * Removes the syntax around `region`, leaving only the raw content text.
 * The post-removal selection preserves the user's intent by mapping the
 * original selection into the surviving content via a single rule that
 * works for both collapsed carets and non-collapsed selections of any
 * shape:
 *  - `prefixLen = region.contentStart - region.regionStart` — the syntax
 *    before the content.
 *  - `newContentEnd = region.regionStart + region.content.length` — the
 *    end of the surviving content.
 *  - collapsed caret `p` → `clamp(p - prefixLen, regionStart, newContentEnd)`.
 *  - non-collapsed `[s, e]` → `clamp(s - prefixLen, …)` and
 *    `clamp(e - prefixLen, …)`, then enforce `newStart <= newEnd`. For
 *    EXACT spans (selection equals the region with syntax OR the content
 *    only) the clamp resolves to `[regionStart, newContentEnd]` — the
 *    surviving content stays selected, so clicking the toolbar button
 *    again (now no longer pressed) re-wraps it with the marker — toggle
 *    behavior.
 *
 * Returns `null` on the native execCommand path (caller skips onChange) or
 * the new full text on the fallback path (caller calls onChange with it).
 */
export const removeFormatting = (
  textarea: HTMLTextAreaElement,
  region: FormatRegion,
): FormattingActionResult => {
  // Capture the user's pre-remove intent BEFORE touching the selection so
  // the restore step below targets the same logical position.
  const collapsed = textarea.selectionStart === textarea.selectionEnd;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;

  const prefixLen = region.contentStart - region.regionStart;
  const newContentEnd = region.regionStart + region.content.length;
  const mappedCaret = (p: number) => Math.max(region.regionStart, Math.min(newContentEnd, p - prefixLen));

  // Some browsers (and jsdom) can have selectionStart/End drift between
  // the caller reading them and the actual selection state; re-assert the
  // range so execCommand acts on the exact characters we computed.
  if (textarea.selectionStart !== region.regionStart || textarea.selectionEnd !== region.regionEnd) {
    textarea.setSelectionRange(region.regionStart, region.regionEnd);
  }

  if (tryExecInsertText(region.content)) {
    if (collapsed) {
      const target = mappedCaret(start);
      textarea.setSelectionRange(target, target);
    } else {
      const newStart = Math.min(mappedCaret(start), mappedCaret(end));
      const newEnd = Math.max(mappedCaret(start), mappedCaret(end));
      textarea.setSelectionRange(newStart, newEnd);
    }
    return null;
  }

  const newText =
    textarea.value.substring(0, region.regionStart) +
    region.content +
    textarea.value.substring(region.regionEnd);

  setTimeout(() => {
    if (collapsed) {
      const target = mappedCaret(start);
      textarea.selectionStart = target;
      textarea.selectionEnd = target;
    } else {
      const newStart = Math.min(mappedCaret(start), mappedCaret(end));
      const newEnd = Math.max(mappedCaret(start), mappedCaret(end));
      textarea.selectionStart = newStart;
      textarea.selectionEnd = newEnd;
    }
    textarea.focus();
  }, 0);

  return newText;
};

/** Remplace `[from, to)` par `replacement` en gardant l'annulation native du navigateur. */
const replaceRange = (textarea: HTMLTextAreaElement, from: number, to: number, replacement: string): boolean => {
  textarea.setSelectionRange(from, to);
  return tryExecInsertText(replacement);
};

/**
 * Transforme la ou les lignes touchées par la sélection en liste à puces ou
 * numérotée ; si elles en sont déjà une du même type, retire la liste.
 * Même contrat de retour que wrapSelection.
 */
export const toggleList = (textarea: HTMLTextAreaElement, kind: ListKind): FormattingActionResult => {
  const value = textarea.value;
  const selStart = textarea.selectionStart;
  const selEnd = textarea.selectionEnd;
  const collapsed = selStart === selEnd;

  const lineStart = value.lastIndexOf('\n', selStart - 1) + 1;
  // Une sélection qui s'arrête au tout début d'une ligne ne touche pas cette ligne.
  const effectiveEnd = !collapsed && value[selEnd - 1] === '\n' ? selEnd - 1 : selEnd;
  const nextBreak = value.indexOf('\n', effectiveEnd);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;

  const lines = value.slice(lineStart, lineEnd).split('\n');
  const filled = lines.filter((line) => line.trim() !== '');
  const remove = filled.length > 0 && filled.every((line) => getListKind(line) === kind);

  let counter = 1;
  const next = lines.map((line) => {
    const bare = line.slice(getListPrefixLength(line));
    if (remove) return bare;
    return kind === 'bullets' ? `- ${bare}` : `${counter++}. ${bare}`;
  });
  const replacement = next.join('\n');

  const caretLineIndex = value.slice(lineStart, selStart).split('\n').length - 1;
  const delta = next[caretLineIndex].length - lines[caretLineIndex].length;
  const restore = () => {
    if (collapsed) {
      const caret = Math.max(lineStart, selStart + delta);
      textarea.setSelectionRange(caret, caret);
    } else {
      textarea.setSelectionRange(lineStart, lineStart + replacement.length);
    }
  };

  if (replaceRange(textarea, lineStart, lineEnd, replacement)) {
    restore();
    return null;
  }

  const newText = value.slice(0, lineStart) + replacement + value.slice(lineEnd);
  setTimeout(() => {
    restore();
    textarea.focus();
  }, 0);
  return newText;
};

/**
 * Touche Entrée dans une liste : crée l'entrée suivante (numéro suivant pour
 * une liste numérotée) ; sur une entrée vide, termine la liste.
 * Retourne `handled: false` hors liste (le comportement normal s'applique).
 */
export const continueListOnEnter = (
  textarea: HTMLTextAreaElement,
): { handled: boolean; result: FormattingActionResult } => {
  const value = textarea.value;
  const caret = textarea.selectionStart;
  if (caret !== textarea.selectionEnd) return { handled: false, result: null };

  const lineStart = value.lastIndexOf('\n', caret - 1) + 1;
  const nextBreak = value.indexOf('\n', caret);
  const lineEnd = nextBreak === -1 ? value.length : nextBreak;
  const line = value.slice(lineStart, lineEnd);
  const kind = getListKind(line);
  const prefixLength = getListPrefixLength(line);
  // Dans le préfixe lui-même, Entrée garde son effet habituel.
  if (!kind || caret < lineStart + prefixLength) return { handled: false, result: null };

  // Entrée sur une entrée vide : la liste s'arrête.
  if (line.slice(prefixLength).trim() === '' && caret === lineEnd) {
    if (replaceRange(textarea, lineStart, lineEnd, '')) {
      textarea.setSelectionRange(lineStart, lineStart);
      return { handled: true, result: null };
    }
    setTimeout(() => { textarea.setSelectionRange(lineStart, lineStart); textarea.focus(); }, 0);
    return { handled: true, result: value.slice(0, lineStart) + value.slice(lineEnd) };
  }

  const prefix = line.slice(0, prefixLength);
  const nextPrefix = kind === 'bullets'
    ? prefix
    : `${Number.parseInt(prefix, 10) + 1}${prefix.trim().endsWith(')') ? ')' : '.'} `;
  const insertion = `\n${nextPrefix}`;
  textarea.setSelectionRange(caret, caret);
  if (tryExecInsertText(insertion)) {
    textarea.setSelectionRange(caret + insertion.length, caret + insertion.length);
    return { handled: true, result: null };
  }
  setTimeout(() => {
    textarea.setSelectionRange(caret + insertion.length, caret + insertion.length);
    textarea.focus();
  }, 0);
  return { handled: true, result: value.slice(0, caret) + insertion + value.slice(caret) };
};
