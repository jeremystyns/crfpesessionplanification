/**
 * MaterialChecklist — Liste de matériel à cocher d'une phase.
 *
 * Coché = matériel prêt. La liste vit dans le champ texte `material`
 * (voir lib/material.ts) ; cocher ou modifier une entrée réécrit ce champ.
 * Un clic sur le texte d'une entrée la rend modifiable ; l'entrée vidée est
 * retirée. Le bouton « Ajouter » vit dans la ligne du sous-titre (voir
 * MaterialAddButton) : la liste n'a donc pas de ligne de plus ; la saisie
 * d'une nouvelle entrée n'apparaît, dans la grille, que pendant l'ajout.
 * Une seule colonne pleine largeur : un intitulé long ne passe à la ligne que
 * s'il dépasse vraiment la largeur disponible.
 * Used by: BlockPreview (cartes de la frise), BlockEditDialog (édition)
 */
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/primitives/checkbox';
import { Button } from '@/components/primitives/button';
import { parseFormatting, autoLinkUrls } from '@/lib/textFormatting';
import { countMaterial, parseMaterial, serializeMaterial } from '@/lib/material';
import { cn } from '@/lib/utils';

interface MaterialChecklistProps {
  value: string;
  onChange?: (value: string) => void;
  /** Permet d'ajouter, de modifier et de retirer des entrées (sinon : cocher seulement). */
  editable?: boolean;
  /** Saisie d'une nouvelle entrée ouverte (pilotée par le parent, avec MaterialAddButton). */
  adding?: boolean;
  onAddingChange?: (adding: boolean) => void;
  /** `lg` : lecture à distance (vue Live). */
  size?: 'sm' | 'lg';
  className?: string;
}

/** Compteur « 2/5 » (prêts / total) affiché à côté du sous-titre. */
export const MaterialCounter = ({ value }: { value: string }) => {
  const { t } = useTranslation('common');
  const { ready, total } = countMaterial(value);
  if (total === 0) return null;
  return (
    <span
      className={cn(
        'ml-1.5 rounded-full px-1.5 py-px text-[10px] font-semibold normal-case tracking-normal',
        ready === total ? 'bg-green-600/15 text-green-800 dark:text-green-300' : 'bg-muted text-muted-foreground',
      )}
      title={t('material.readyCount', { ready, total })}
    >
      {ready}/{total}
    </span>
  );
};

// Même taille d'écriture que les objectifs et la description (14 px).
const TEXT = 'text-sm leading-5';
const ENTRY_INPUT = cn(
  TEXT,
  'h-6 w-full min-w-0 rounded border border-input bg-card px-1 text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring',
);

export const MaterialChecklist = ({
  value,
  onChange,
  editable = false,
  adding: addingProp,
  onAddingChange,
  size = 'sm',
  className,
}: MaterialChecklistProps) => {
  const { t } = useTranslation('common');
  const entries = parseMaterial(value);
  const [addingState, setAddingState] = useState(false);
  const adding = addingProp ?? addingState;
  const setAdding = (value: boolean) => { setAddingState(value); onAddingChange?.(value); };
  const [draft, setDraft] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const update = (next: typeof entries) => onChange?.(serializeMaterial(next));
  const toggle = (index: number) =>
    update(entries.map((entry, i) => (i === index ? { ...entry, done: !entry.done } : entry)));
  const remove = (index: number) => update(entries.filter((_, i) => i !== index));
  const rename = (index: number, text: string) =>
    update(entries.map((entry, i) => (i === index ? { ...entry, text } : entry)));

  /** Fin de saisie d'une entrée : vide = retirée, sinon liens détectés. */
  const finishEditing = (index: number) => {
    const text = entries[index]?.text.trim() ?? '';
    setEditingIndex(null);
    if (!text) remove(index);
    else if (text !== entries[index].text || autoLinkUrls(text) !== text) rename(index, autoLinkUrls(text));
  };

  const commitDraft = (keepOpen: boolean) => {
    const text = autoLinkUrls(draft.trim());
    if (text) update([...entries, { text, done: false }]);
    setDraft('');
    if (!keepOpen) setAdding(false);
  };

  const showAddInput = editable && (adding || entries.length === 0);

  return (
    <ul className={cn('grid gap-y-1', size === 'lg' ? 'gap-y-2 text-lg leading-7' : TEXT, className)}>
      {entries.map((entry, index) => (
        <li key={index} className="group/entry flex min-h-6 items-center gap-2">
          <Checkbox
            checked={entry.done}
            onCheckedChange={() => toggle(index)}
            onClick={(e) => e.stopPropagation()}
            aria-label={t('material.toggle', { name: entry.text })}
            className={cn('border-current', size === 'lg' ? 'h-5 w-5' : 'h-4 w-4')}
            disabled={!onChange}
          />
          {editable && editingIndex === index ? (
            <input
              autoFocus
              value={entry.text}
              aria-label={t('material.edit', { name: entry.text })}
              className={ENTRY_INPUT}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => rename(index, e.target.value)}
              onBlur={() => finishEditing(index)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === 'Escape') { e.preventDefault(); e.currentTarget.blur(); }
              }}
            />
          ) : (
            <span
              className={cn(
                'min-w-0 flex-1 break-words',
                entry.done && 'text-muted-foreground',
                editable && 'editable-field editable-field-no-fill -mx-1 cursor-text rounded px-1',
              )}
              onClick={editable ? (e) => { e.stopPropagation(); setEditingIndex(index); } : undefined}
              title={editable ? t('material.editHint') : undefined}
            >
              {parseFormatting(entry.text)}
            </span>
          )}
          {editable && editingIndex !== index && (
            <Button
              variant="plain"
              size="none"
              type="button"
              onClick={(e) => { e.stopPropagation(); remove(index); }}
              className="h-5 w-5 shrink-0 rounded opacity-0 hover:bg-muted focus-visible:opacity-100 group-hover/entry:opacity-100 print:hidden"
              aria-label={t('material.remove', { name: entry.text })}
              title={t('material.remove', { name: entry.text })}
            >
              <X className="mx-auto h-3 w-3" />
            </Button>
          )}
        </li>
      ))}
      {showAddInput && (
        <li className="flex min-h-6 items-center print:hidden">
          <input
            value={draft}
            autoFocus={adding}
            placeholder={t('material.addPlaceholder')}
            aria-label={t('dialog.addMaterial')}
            className={ENTRY_INPUT}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); commitDraft(true); }
              if (e.key === 'Escape') { setDraft(''); setAdding(false); }
            }}
            onBlur={() => commitDraft(false)}
          />
        </li>
      )}
    </ul>
  );
};

/** Bouton « Ajouter du matériel », à poser dans la ligne du sous-titre. */
export const MaterialAddButton = ({ onClick, className }: { onClick: () => void; className?: string }) => {
  const { t } = useTranslation('common');
  return (
    <Button
      variant="plain"
      size="none"
      type="button"
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={cn('flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground print:hidden', className)}
    >
      <Plus className="h-3 w-3" />
      {t('dialog.addMaterial')}
    </Button>
  );
};
