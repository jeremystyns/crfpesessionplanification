import { useState } from 'react';
import { AlignLeft, MapPin, Package, Target, type LucideIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { hasListSyntax, renderRichText } from '@/lib/textFormatting';
import { FormattedTextField } from '@/components/atoms/FormattedTextField';
import { EditableFieldPencil } from '@/components/atoms/EditableFieldPencil';
import { useIsMobile } from '@/hooks/use-mobile';
import { useClickToEdit } from '@/hooks/useClickToEdit';
import type { RoomLayout } from '@/types/workshop';
import { ROOM_LAYOUT_ICONS } from '@/lib/roomLayout';
import { MaterialAddButton, MaterialChecklist, MaterialCounter } from './MaterialChecklist';

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
  /** Conservé pour compatibilité : les ajouts rapides au survol n'existent plus. */
  showEmptyPlaceholders?: boolean;
  onUpdate?: (updates: { objectives?: string; notes?: string; material?: string }) => void;
}

/** Sous-titre d'une section : petite icône à gauche, texte en gras, espace dessous. */
export const SectionTitle = ({ icon: Icon, children, className }: { icon: LucideIcon; children: React.ReactNode; className?: string }) => (
  <span className={cn('mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-[hsl(var(--content-subtitle))]', className)}>
    <Icon className="h-3.5 w-3.5 shrink-0 text-primary-text" aria-hidden />
    <span>{children}</span>
  </span>
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
  showFullText = true,
  onUpdate,
}: BlockPreviewProps) => {
  const isMobile = useIsMobile();
  // Le texte se modifie en place hors mobile ; cocher le matériel reste possible partout.
  const canEdit = !!onUpdate && !isMobile;
  const { t } = useTranslation('common');
  const [forced, setForced] = useState<Partial<Record<FieldKey, boolean>>>({});
  const force = (field: FieldKey, value: boolean) => setForced((prev) => ({ ...prev, [field]: value }));

  // Vue organisationnelle (option « Vue organisationnelle ») : objectifs et descriptions
  // sont masqués, on garde le matériel, le lieu, la salle et la disposition.
  const organisational = !showFullText;
  const hasMeta = !!location || !!room || !!layout;
  const active: Record<FieldKey, boolean> = {
    objectives: !organisational && (!!objectives || !!forced.objectives),
    notes: !organisational && (!!notes || !!forced.notes),
    material: !!material || !!forced.material,
  };

  // Rien à montrer : pas de bloc vide. Objectifs, description et matériel s'ajoutent
  // depuis la fenêtre d'édition (clic sur la carte ou menu « Modifier »).
  if (!hasMeta && !active.objectives && !active.notes && !active.material) return null;

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

  return (
    <div className="relative mr-4 mt-3 text-sm text-[hsl(var(--content-text))]">
      {hasMeta && <div className="mb-3"><ItemMetaChips location={location} room={room} layout={layout} /></div>}
      {/* Objectifs, description et matériel : espacés et séparés par un filet discret. */}
      <div className="divide-y divide-border/70">

      {active.objectives && (
        <section aria-label={t('dialog.objectives')} className="py-3 first:pt-0 last:pb-0">
          <SectionTitle icon={Target}>{t('dialog.objectives')}</SectionTitle>
          {textField('objectives', objectives)}
        </section>
      )}

      {active.notes && (
        <section aria-label={t('dialog.notes')} className="py-3 first:pt-0 last:pb-0">
          <SectionTitle icon={AlignLeft}>{t('dialog.notes')}</SectionTitle>
          {textField('notes', notes)}
        </section>
      )}

      {active.material && (
        <section aria-label={t('dialog.material')} className="py-3 first:pt-0 last:pb-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <SectionTitle icon={Package} className="mb-0">
              {t('dialog.material')}
              <MaterialCounter value={material || ''} />
            </SectionTitle>
            {canEdit && !forced.material && <MaterialAddButton onClick={() => force('material', true)} />}
          </div>
          <MaterialChecklist
            value={material || ''}
            onChange={onUpdate ? (v) => onUpdate({ material: v }) : undefined}
            editable={canEdit}
            adding={!!forced.material}
            onAddingChange={(v) => force('material', v)}
            className="text-[hsl(var(--content-text))]"
          />
        </section>
      )}
      </div>

    </div>
  );
};
