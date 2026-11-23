import { DoorOpen, MapPin, Users } from 'lucide-react';
import { Button } from '@/components/primitives/button';
import { Input } from '@/components/primitives/input';
import { useTranslation } from 'react-i18next';
import { FormattedTextField } from '@/components/atoms/FormattedTextField';
import { EditableFieldPencil } from '@/components/atoms/EditableFieldPencil';
import { EmptyStartTimeButton } from './atoms/EmptyStartTimeButton';
import { CalendarLeaf } from './CalendarLeaf';
import { parseFormatting } from '@/lib/textFormatting';
import { useClickToEdit } from '@/hooks/useClickToEdit';
import { cn } from '@/lib/utils';
import { useShortcutLabels } from '@/hooks/useShortcutLabels';

interface WorkshopDescriptionProps {
  description: string;
  date?: string | null;
  startTime?: string | null;
  onAddStartTimeClick?: () => void;
  showFullText?: boolean;
  onUpdate?: (desc: string) => void;
  /** Nombre de participants, lieu et salle du jour affiché. */
  participants?: number;
  location?: string;
  room?: string;
  onUpdateDetails?: (updates: { participants?: number; location?: string; room?: string }) => void;
}

interface DetailFieldProps {
  id: string;
  icon: typeof Users;
  label: string;
  children: React.ReactNode;
}

const DetailField = ({ id, icon: Icon, label, children }: DetailFieldProps) => (
  <div className="grid gap-1">
    <label htmlFor={id} className="flex items-center gap-1.5 text-xs font-semibold text-primary-text">
      <Icon className="h-3.5 w-3.5" aria-hidden />
      {label}
    </label>
    {children}
  </div>
);

/**
 * Cartouche de la séance (ou du jour) : description, nombre de participants,
 * lieu et salle. Distincte des blocs par un fond teinté et un filet d'accent
 * de 4 px en haut (charte CRFPE : pas de bordure latérale colorée).
 */
export const WorkshopDescription = ({
  description,
  date,
  startTime,
  onAddStartTimeClick,
  showFullText = true,
  onUpdate,
  participants,
  location,
  room,
  onUpdateDetails,
}: WorkshopDescriptionProps) => {
  const { t } = useTranslation('common');
  const { withHint, hintAttrs } = useShortcutLabels();
  const {
    previewRef,
    editing,
    startEditing,
    stopEditing,
    caretPoint,
    initialSelection,
  } = useClickToEdit<HTMLButtonElement>({ value: description });

  return (
    <div className="flex flex-col sm:flex-row items-start gap-2">
      {(date || !startTime) && (
        <div className="flex flex-row items-center sm:flex-col sm:items-stretch gap-2 sm:gap-0.5 shrink-0 mt-0.5 md:w-[6rem] md:-ml-[8rem] md:mr-8 md:text-right">
          {date && <CalendarLeaf date={date} className="md:ml-auto" />}
          {!startTime && (
            <EmptyStartTimeButton onClick={onAddStartTimeClick} className="sm:self-end sm:mt-0.5" />
          )}
        </div>
      )}
      {(showFullText || onUpdateDetails) && (
      <section
        aria-label={t('planner.infoCardLabel')}
        data-testid="session-info-card"
        className="w-full flex-1 min-w-0 overflow-hidden rounded-md border border-t-4 border-t-primary bg-[#b7ddff]/30 shadow-sm dark:bg-primary/15 print:border-gray-300 print:bg-transparent print:shadow-none"
      >
        <div className="flex flex-col gap-3 p-3">
      {showFullText && (
      <div className="w-full sm:w-auto flex-1 min-w-0">
        {editing ? (
          // Padding + min height live on this wrapper (not on the textarea)
          // so the formatting backdrop inside FormattedTextField stays
          // perfectly aligned with the text it highlights. Deliberately
          // borderless with no focus ring — while editing, the field should
          // look like plain text, same as the inline block previews (the
          // caret and formatting toolbar are the editing affordances).
          <div
            className="w-full px-3 py-2 text-sm print:p-0 print:min-h-0"
          >
            <FormattedTextField
              value={description}
              onChange={(v) => onUpdate?.(v)}
              onBlur={() => stopEditing()}
              placeholder={t('planner.descriptionPlaceholder')}
              multiline
              autoGrow
              autoFocus
              initialCaretPoint={caretPoint}
              initialSelection={initialSelection}
              dataAttributes={{ 'data-session-description': '' }}
              className="w-full"
            />
          </div>
        ) : (
          <Button variant="plain" size="none"
            ref={previewRef}
            onClick={startEditing}
            className={cn(
              'px-2 py-1 text-left w-full text-sm text-[hsl(var(--content-text))] hover:bg-inherit transition-colors print:hidden',
              onUpdate && 'editable-field',
            )}
            data-session-description
            data-shortcut-outside
            title={onUpdate ? withHint(t('planner.descriptionPlaceholder'), 'focusDescription') : undefined}
            {...(onUpdate ? hintAttrs('focusDescription') : {})}
          >
            {description ? (
              <span className={showFullText ? 'whitespace-pre-wrap break-words' : 'line-clamp-3 whitespace-pre-wrap break-words'}>
                {parseFormatting(description)}
                {onUpdate && <EditableFieldPencil className="ml-1" />}
              </span>
            ) : (
              <span>
                {t('planner.descriptionPlaceholder')}
                {onUpdate && <EditableFieldPencil className="ml-1" />}
              </span>
            )}
          </Button>
        )}
        {/* Print: always show formatted description */}
        {description && !editing && (
          <p className="hidden print:block text-sm whitespace-pre-wrap break-words">
            {parseFormatting(description)}
          </p>
        )}
      </div>
      )}
      {onUpdateDetails && (
        <div className={cn('grid gap-2.5 sm:grid-cols-[7rem_minmax(0,1fr)_minmax(0,1fr)]', showFullText && 'border-t border-primary/20 pt-3')}>
          <DetailField id="session-participants" icon={Users} label={t('planner.participants')}>
            <Input
              id="session-participants"
              type="number"
              min={0}
              inputMode="numeric"
              value={participants ?? ''}
              placeholder={t('planner.participantsPlaceholder')}
              onChange={(e) => {
                const n = Number.parseInt(e.target.value, 10);
                onUpdateDetails({ participants: Number.isFinite(n) && n >= 0 ? n : undefined });
              }}
              className="h-8 bg-card text-sm"
            />
          </DetailField>
          <DetailField id="session-location" icon={MapPin} label={t('planner.location')}>
            <Input
              id="session-location"
              value={location ?? ''}
              placeholder={t('planner.locationPlaceholder')}
              onChange={(e) => onUpdateDetails({ location: e.target.value })}
              className="h-8 bg-card text-sm"
            />
          </DetailField>
          <DetailField id="session-room" icon={DoorOpen} label={t('planner.room')}>
            <Input
              id="session-room"
              value={room ?? ''}
              placeholder={t('planner.roomPlaceholder')}
              onChange={(e) => onUpdateDetails({ room: e.target.value })}
              className="h-8 bg-card text-sm"
            />
          </DetailField>
        </div>
      )}
        </div>
      </section>
      )}
    </div>
  );
};
