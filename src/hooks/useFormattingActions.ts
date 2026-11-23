/**
 * useFormattingActions — shared routing for the formatting toolbar buttons
 * and the Cmd/Ctrl+B/I/K keyboard shortcuts.
 *
 * Bold/Italic use the same toggle-or-wrap logic: if the caret/selection
 * currently sits inside a matching format region, toggle that region OFF;
 * otherwise wrap the selection with the marker. The same functions back
 * both the toolbar buttons and the keyboard shortcuts so they share
 * toggle semantics — e.g. inside a nested chain like `*_hello_*`, only
 * the matched layer is removed when either input fires.
 *
 * Link is two-state: caret inside an existing link toggles it off;
 * otherwise the selection (required) is wrapped with `[text](url)` after
 * prompting for a URL.
 *
 * The DOM-level mutation lives in textFormattingActions
 * (wrapSelection / insertLink / removeFormatting), which keeps the
 * browser's native undo stack in sync via document.execCommand.
 * applyMarkerOrToggle here calls those and forwards the returned text
 * (or null on the native path) to the parent's onChange.
 *
 * On Mac the modifier key is `metaKey`; elsewhere it's `ctrlKey`.
 * `isMacPlatform` from @/lib/domUtils prefers the modern User-Agent
 * Client Hints API (`navigator.userAgentData.platform`) and falls back
 * to the deprecated `navigator.platform`. Both surfaces are matched with
 * a case-insensitive MAC substring check.
 */
import { RefObject, useCallback } from 'react';
import { KeyboardEvent } from 'react';
import {
  findActiveRegionOfKind,
} from '@/lib/textFormatting';
import {
  continueListOnEnter,
  toggleList,
  wrapSelection,
  insertLink,
  promptForLink,
  removeFormatting,
} from '@/lib/textFormattingActions';
import { isMacPlatform } from '@/lib/domUtils';

export interface UseFormattingActionsResult {
  handleKeyDown: (e: KeyboardEvent<HTMLTextAreaElement>) => void;
  handleBold: () => void;
  handleItalic: () => void;
  handleLink: () => void;
  handleHighlight: () => void;
  handleBullets: () => void;
  handleNumbers: () => void;
}

export const useFormattingActions = ({
  textareaRef,
  multiline,
  onChange,
  scheduleSelectionStateUpdate,
}: {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  multiline: boolean;
  onChange: (value: string) => void;
  scheduleSelectionStateUpdate: () => void;
}): UseFormattingActionsResult => {
  // Shared routing for Bold/Italic: if the caret/selection currently sits
  // inside a matching format region, toggle it OFF; otherwise wrap the
  // selection with the marker. Used by both the toolbar buttons and the
  // Cmd/Ctrl+B/I keyboard shortcuts so they share toggle semantics. In a
  // nested chain like `*_hello_*` only the matched layer is removed — the
  // outer/inner regions stay intact.
  const applyMarkerOrToggle = useCallback((kind: 'bold' | 'italic' | 'highlight', marker: '*' | '_' | '==') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const region = findActiveRegionOfKind(textarea.value, textarea.selectionStart, textarea.selectionEnd, kind);
    if (region) {
      const result = removeFormatting(textarea, region);
      if (result !== null) onChange(result);
    } else {
      const result = wrapSelection(textarea, marker);
      if (result !== null) onChange(result);
    }
    scheduleSelectionStateUpdate();
  }, [textareaRef, onChange, scheduleSelectionStateUpdate]);

  const handleBold = useCallback(() => applyMarkerOrToggle('bold', '*'), [applyMarkerOrToggle]);
  const handleItalic = useCallback(() => applyMarkerOrToggle('italic', '_'), [applyMarkerOrToggle]);
  const handleHighlight = useCallback(() => applyMarkerOrToggle('highlight', '=='), [applyMarkerOrToggle]);

  const applyList = useCallback((kind: 'bullets' | 'numbers') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const result = toggleList(textarea, kind);
    if (result !== null) onChange(result);
    scheduleSelectionStateUpdate();
  }, [textareaRef, onChange, scheduleSelectionStateUpdate]);
  const handleBullets = useCallback(() => applyList('bullets'), [applyList]);
  const handleNumbers = useCallback(() => applyList('numbers'), [applyList]);

  const handleLink = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    // Toggle-off path: caret inside an existing link → remove the syntax.
    // Used by both the toolbar button and Cmd/Ctrl+K.
    const region = findActiveRegionOfKind(textarea.value, textarea.selectionStart, textarea.selectionEnd, 'link');
    if (region) {
      const result = removeFormatting(textarea, region);
      if (result !== null) onChange(result);
      scheduleSelectionStateUpdate();
      return;
    }
    // Insert path: needs a selection to wrap with `[text](url)`.
    const selectedText = textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
    if (!selectedText) return;
    const url = promptForLink();
    if (!url) return;
    const result = insertLink(textarea, url);
    if (result !== null && result !== textarea.value) onChange(result);
    scheduleSelectionStateUpdate();
  }, [textareaRef, onChange, scheduleSelectionStateUpdate]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      return;
    }

    // Entrée dans une liste : entrée suivante, ou fin de liste sur une entrée vide.
    if (multiline && e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && !e.nativeEvent.isComposing) {
      const textarea = textareaRef.current;
      if (textarea) {
        const { handled, result } = continueListOnEnter(textarea);
        if (handled) {
          e.preventDefault();
          if (result !== null) onChange(result);
          scheduleSelectionStateUpdate();
          return;
        }
      }
    }

    const isMac = isMacPlatform();
    const modKey = isMac ? e.metaKey : e.ctrlKey;
    if (!modKey) return;

    // Ctrl/Cmd+Maj+8 : puces, +7 : numérotée, +H : surlignage.
    if (e.shiftKey) {
      if (e.code === 'Digit8') { e.preventDefault(); handleBullets(); }
      else if (e.code === 'Digit7') { e.preventDefault(); handleNumbers(); }
      else if (e.key === 'h' || e.key === 'H') { e.preventDefault(); handleHighlight(); }
      return;
    }

    if (e.key === 'b' || e.key === 'B') {
      e.preventDefault();
      handleBold();
    } else if (e.key === 'i' || e.key === 'I') {
      e.preventDefault();
      handleItalic();
    } else if (e.key === 'k' || e.key === 'K') {
      e.preventDefault();
      handleLink();
    }
  }, [multiline, textareaRef, onChange, scheduleSelectionStateUpdate, handleBold, handleItalic, handleLink, handleBullets, handleNumbers, handleHighlight]);

  return { handleKeyDown, handleBold, handleItalic, handleLink, handleHighlight, handleBullets, handleNumbers };
};
