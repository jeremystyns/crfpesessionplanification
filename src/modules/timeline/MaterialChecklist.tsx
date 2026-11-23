/**
 * MaterialChecklist — Liste de matériel à cocher d'une phase.
 *
 * Coché = matériel prêt. La liste vit dans le champ texte `material`
 * (voir lib/material.ts) ; cocher une case réécrit ce champ.
 * Used by: BlockPreview (cartes de la frise), BlockEditDialog (édition)
 */
import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Checkbox } from '@/components/primitives/checkbox';
import { Input } from '@/components/primitives/input';
import { Button } from '@/components/primitives/button';
import { parseFormatting, autoLinkUrls } from '@/lib/textFormatting';
import { countMaterial, parseMaterial, serializeMaterial } from '@/lib/material';
import { cn } from '@/lib/utils';

interface MaterialChecklistProps {
  value: string;
  onChange?: (value: string) => void;
  /** Permet d'ajouter et de retirer des entrées (sinon : cocher seulement). */
  editable?: boolean;
  /** Ouvre directement la saisie d'une nouvelle entrée. */
  startAdding?: boolean;
  onStopAdding?: () => void;
  className?: string;
}

/** Compteur « 2/5 prêts » affiché à côté du sous-titre. */
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

export const MaterialChecklist = ({
  value,
  onChange,
  editable = false,
  startAdding = false,
  onStopAdding,
  className,
}: MaterialChecklistProps) => {
  const { t } = useTranslation('common');
  const entries = parseMaterial(value);
  const [adding, setAdding] = useState(startAdding);
  const [draft, setDraft] = useState('');

  const update = (next: typeof entries) => onChange?.(serializeMaterial(next));
  const toggle = (index: number) =>
    update(entries.map((entry, i) => (i === index ? { ...entry, done: !entry.done } : entry)));
  const remove = (index: number) => update(entries.filter((_, i) => i !== index));

  const commitDraft = (keepOpen: boolean) => {
    const text = autoLinkUrls(draft.trim());
    if (text) update([...entries, { text, done: false }]);
    setDraft('');
    if (!keepOpen) {
      setAdding(false);
      onStopAdding?.();
    }
  };

  return (
    <div className={cn('space-y-1', className)}>
      {entries.length > 0 && (
        <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
          {entries.map((entry, index) => (
            <li key={`${index}-${entry.text}`} className="group/entry flex items-start gap-2">
              <Checkbox
                checked={entry.done}
                onCheckedChange={() => toggle(index)}
                onClick={(e) => e.stopPropagation()}
                aria-label={t('material.toggle', { name: entry.text })}
                className="mt-0.5 h-4 w-4 border-current"
                disabled={!onChange}
              />
              <span className={cn('min-w-0 flex-1 break-words', entry.done && 'text-muted-foreground')}>
                {parseFormatting(entry.text)}
              </span>
              {editable && (
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
        </ul>
      )}
      {editable && (adding || entries.length === 0) ? (
        <Input
          value={draft}
          autoFocus={adding}
          placeholder={t('material.addPlaceholder')}
          aria-label={t('dialog.addMaterial')}
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); commitDraft(true); }
            if (e.key === 'Escape') { setDraft(''); setAdding(false); onStopAdding?.(); }
          }}
          onBlur={() => commitDraft(false)}
          className="h-7 bg-card text-sm print:hidden"
        />
      ) : (
        editable && (
          <Button
            variant="plain"
            size="none"
            type="button"
            onClick={(e) => { e.stopPropagation(); setAdding(true); }}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground print:hidden"
          >
            <Plus className="h-3 w-3" />
            {t('dialog.addMaterial')}
          </Button>
        )
      )}
    </div>
  );
};
