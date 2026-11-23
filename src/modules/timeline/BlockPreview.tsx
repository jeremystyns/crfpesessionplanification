import { Button } from '@/components/primitives/button';
import { useState } from 'react';
import { MapPin, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { hasListSyntax, renderRichText } from '@/lib/textFormatting';
import { FormattedTextField } from '@/components/atoms/FormattedTextField';
import { EditableFieldPencil } from '@/components/atoms/EditableFieldPencil';
import { useIsMobile } from '@/hooks/use-mobile';
import { useClickToEdit } from '@/hooks/useClickToEdit';
import type { RoomLayout } from '@/types/workshop';
import { ROOM_LAYOUT_ICONS } from '@/lib/roomLayout';
import { MaterialChecklist, MaterialCounter } from './MaterialChecklist';

const InlineEditableField = ({
  value,
  onChange,
  showFullText,
  multiline = false,
  startFocused = false,
  onEmptyBlur,
  align = 'left',
}: {
  value: string;
  onChange: (v: string) => void;
  showFullText: boolean;
  multiline?: boolean;
  startFocused?: boolean;
  onEmptyBlur?: () => void;
  align?: 'left' | 'right';
}) => {
  const {
    previewRef,
    editing,
    startEditing,
    stopEditing,
    caretPoint,
    initialSelection,
  } = useClickToEdit<HTMLDivElement>({ value, initiallyEditing: startFocused });

  if (!editing) {
    return (
      <div
        ref={previewRef}
        className={cn(
          'editable-field editable-field-no-fill cursor-text px-1 -mx-1',
          showFullText ? 'whitespace-pre-wrap break-words' : 'line-clamp-2',
          align === 'right' && 'text-right',
        )}
        onClick={(e) => {
          e.stopPropagation();
          startEditing(e);
        }}
      >
        {/* Pencil cue: before the text when right-aligned, after it when
            left-aligned, so its reserved space always lands in whitespace and
            the text itself never shifts. */}
        {align === 'right' && <EditableFieldPencil className="mr-1" />}
        {renderRichText(value)}
        {/* Après une liste, le crayon tomberait sur une ligne à lui seul. */}
        {align !== 'right' && !hasListSyntax(value) && <EditableFieldPencil className="ml-1" />}
      </div>
    );
  }

  return (
    <FormattedTextField
      value={value}
      onChange={onChange}
      onBlur={(v) => {
        stopEditing();
        if (!v) onEmptyBlur?.();
      }}
      multiline={multiline}
      autoGrow
      autoFocus
      toolbarSize="xs"
      align={align}
      initialCaretPoint={caretPoint}
      initialSelection={initialSelection}
      className="w-full"
    />
  );
};

interface BlockPreviewProps {
  objectives?: string;
  notes?: string;
  material?: string;
  /** Lieu, salle et disposition propres à cette phase. */
  location?: string;
  room?: string;
  layout?: RoomLayout;
  showFullText?: boolean;
  /** Conservé pour compatibilité : les champs sont désormais toujours empilés. */
  stackFields?: boolean;
  showEmptyPlaceholders?: boolean;
  onUpdate?: (updates: { objectives?: string; notes?: string; material?: string }) => void;
}

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{children}</p>
);

/** Lieu, salle et disposition de la phase, en pastilles. */
const ItemMetaChips = ({ location, room, layout }: { location?: string; room?: string; layout?: RoomLayout }) => {
  const { t } = useTranslation('common');
  const place = [location, room].filter(Boolean).join(' · ');
  if (!place && !layout) return null;
  const LayoutIcon = layout ? ROOM_LAYOUT_ICONS[layout] : null;
  const chip = 'inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground';
  return (
    <div className="flex flex-wrap gap-1.5">
      {place && (
        <span className={chip} title={t('planner.location')}>
          <MapPin className="h-3 w-3 shrink-0" aria-hidden />
          {place}
        </span>
      )}
      {layout && LayoutIcon && (
        <span className={chip} title={t('dialog.layout')}>
          <LayoutIcon className="h-3 w-3 shrink-0" aria-hidden />
          {t(`layouts.${layout}`)}
        </span>
      )}
    </div>
  );
};

type FieldKey = 'objectives' | 'notes' | 'material';

export const BlockPreview = ({
  objectives,
  notes,
  material,
  location,
  room,
  layout,
  showFullText = false,
  showEmptyPlaceholders = true,
  onUpdate,
}: BlockPreviewProps) => {
  const isMobile = useIsMobile();
  // Le texte se modifie en place hors mobile ; cocher le matériel reste possible partout.
  const canEdit = !!onUpdate && !isMobile;
  const { t } = useTranslation('common');
  const [forced, setForced] = useState<Partial<Record<FieldKey, boolean>>>({});
  const force = (field: FieldKey, value: boolean) => setForced((prev) => ({ ...prev, [field]: value }));

  const hasMeta = !!location || !!room || !!layout;
  const active: Record<FieldKey, boolean> = {
    objectives: !!objectives || !!forced.objectives,
    notes: !!notes || !!forced.notes,
    material: !!material || !!forced.material,
  };

  if (!hasMeta && !active.objectives && !active.notes && !active.material && !canEdit) return null;

  const textField = (field: 'objectives' | 'notes', value: string | undefined) =>
    canEdit ? (
      <InlineEditableField
        value={value || ''}
        onChange={(v) => onUpdate!({ [field]: v })}
        showFullText={showFullText}
        multiline
        startFocused={!!forced[field]}
        onEmptyBlur={() => force(field, false)}
      />
    ) : (
      <div className={showFullText ? 'whitespace-pre-wrap break-words' : 'line-clamp-2'}>{renderRichText(value || '')}</div>
    );

  const missing = (['objectives', 'notes', 'material'] as FieldKey[]).filter((f) => !active[f]);
  const addLabels: Record<FieldKey, string> = {
    objectives: t('dialog.addObjectives'),
    notes: t('dialog.addNotes'),
    material: t('dialog.addMaterial'),
  };

  return (
    <div className="relative mr-4 mt-2 space-y-2 text-sm text-muted-foreground">
      {hasMeta && <ItemMetaChips location={location} room={room} layout={layout} />}

      {active.objectives && (
        <section aria-label={t('dialog.objectives')}>
          <SectionTitle>{t('dialog.objectives')}</SectionTitle>
          {textField('objectives', objectives)}
        </section>
      )}

      {active.notes && (
        <section aria-label={t('dialog.notes')}>
          <SectionTitle>{t('dialog.notes')}</SectionTitle>
          {textField('notes', notes)}
        </section>
      )}

      {active.material && (
        <section aria-label={t('dialog.material')}>
          <SectionTitle>
            {t('dialog.material')}
            <MaterialCounter value={material || ''} />
          </SectionTitle>
          <MaterialChecklist
            value={material || ''}
            onChange={onUpdate ? (v) => onUpdate({ material: v }) : undefined}
            editable={canEdit}
            startAdding={!!forced.material && !material}
            onStopAdding={() => force('material', false)}
            className="text-foreground"
          />
        </section>
      )}

      {/* Ajouts rapides : posés dans la marge basse de la carte, sans en changer la hauteur. */}
      {canEdit && showEmptyPlaceholders && missing.length > 0 && (
        <div className="pointer-events-none absolute right-0 top-full z-10 flex gap-1 opacity-0 transition-opacity delay-0 group-hover:pointer-events-auto group-hover:opacity-100 group-hover:delay-300 focus-within:pointer-events-auto focus-within:opacity-100 print:hidden">
          {missing.map((field) => (
            <Button
              key={field}
              variant="plain"
              size="none"
              type="button"
              onClick={(e) => { e.stopPropagation(); force(field, true); }}
              className="flex h-4 items-center gap-0.5 rounded-sm bg-card/90 px-1 text-[11px] leading-4 text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-3 w-3 shrink-0" />
              {addLabels[field]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};
