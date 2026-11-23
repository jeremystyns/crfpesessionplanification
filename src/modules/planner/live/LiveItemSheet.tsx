/**
 * LiveItemSheet — Fiche d'un élément pour la vue Live, dans un ordre de lecture
 * fixe : objectifs, description, matériel (à cocher), lieu et disposition,
 * personnes. Les sections vides sont omises.
 * Used by: LiveFocusView
 */
import { AlignLeft, DoorOpen, MapPin, Package, Target, Users } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PersonAvatar } from '@/components/atoms/PersonAvatar';
import { SectionTitle } from '@/modules/timeline/BlockPreview';
import { MaterialChecklist, MaterialCounter } from '@/modules/timeline/MaterialChecklist';
import { renderRichText } from '@/lib/textFormatting';
import { ROOM_LAYOUT_ICONS } from '@/lib/roomLayout';
import type { Person, WorkshopItem } from '@/types/workshop';

interface LiveItemSheetProps {
  item: WorkshopItem;
  persons: Person[];
  /** Lieu et salle de la journée, utilisés quand l'élément n'a pas les siens. */
  fallbackLocation?: string;
  fallbackRoom?: string;
  onUpdateItem: (id: string, updates: Partial<WorkshopItem>) => void;
}

const SECTION = 'border-t border-border/70 pt-5 first:border-t-0 first:pt-0';
const TITLE = 'text-sm';
const BODY = 'whitespace-pre-wrap break-words text-lg leading-7 text-[hsl(var(--content-text))]';

export const hasSheetContent = (item: WorkshopItem, persons: Person[], fallbackLocation?: string, fallbackRoom?: string): boolean =>
  !!(
    item.objectives || item.notes || item.material || item.layout ||
    item.location || item.room || fallbackLocation || fallbackRoom ||
    (item.personIds ?? []).some((id) => persons.some((p) => p.id === id))
  );

export const LiveItemSheet = ({ item, persons, fallbackLocation, fallbackRoom, onUpdateItem }: LiveItemSheetProps) => {
  const { t } = useTranslation('common');
  const location = item.location || fallbackLocation;
  const room = item.room || fallbackRoom;
  const LayoutIcon = item.layout ? ROOM_LAYOUT_ICONS[item.layout] : null;
  const assigned = (item.personIds ?? [])
    .map((id) => persons.find((p) => p.id === id))
    .filter((p): p is Person => !!p);

  if (!hasSheetContent(item, persons, fallbackLocation, fallbackRoom)) {
    return <p className="text-lg text-muted-foreground">{t('live.sheetEmpty')}</p>;
  }

  return (
    <div className="space-y-5" data-testid="live-sheet">
      {item.objectives && (
        <section aria-label={t('dialog.objectives')} className={SECTION}>
          <SectionTitle icon={Target} className={TITLE}>{t('dialog.objectives')}</SectionTitle>
          <div className={BODY}>{renderRichText(item.objectives)}</div>
        </section>
      )}

      {item.notes && (
        <section aria-label={t('dialog.notes')} className={SECTION}>
          <SectionTitle icon={AlignLeft} className={TITLE}>{t('dialog.notes')}</SectionTitle>
          <div className={BODY}>{renderRichText(item.notes)}</div>
        </section>
      )}

      {item.material && (
        <section aria-label={t('dialog.material')} className={SECTION}>
          <SectionTitle icon={Package} className={TITLE}>
            {t('dialog.material')}
            <MaterialCounter value={item.material} />
          </SectionTitle>
          <MaterialChecklist
            value={item.material}
            onChange={(value) => onUpdateItem(item.id, { material: value })}
            size="lg"
            className="text-[hsl(var(--content-text))]"
          />
        </section>
      )}

      {(location || room || LayoutIcon) && (
        <section aria-label={t('live.placeSection')} className={SECTION}>
          <SectionTitle icon={MapPin} className={TITLE}>{t('live.placeSection')}</SectionTitle>
          <div className="flex flex-wrap gap-2 text-base text-[hsl(var(--content-text))]">
            {location && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
                <MapPin className="h-4 w-4" aria-hidden />
                {location}
              </span>
            )}
            {room && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
                <DoorOpen className="h-4 w-4" aria-hidden />
                {room}
              </span>
            )}
            {item.layout && LayoutIcon && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1">
                <LayoutIcon className="h-4 w-4" aria-hidden />
                {t(`layouts.${item.layout}`)}
              </span>
            )}
          </div>
        </section>
      )}

      {assigned.length > 0 && (
        <section aria-label={t('live.people')} className={SECTION}>
          <SectionTitle icon={Users} className={TITLE}>{t('live.people')}</SectionTitle>
          <ul className="flex flex-wrap gap-3 text-base text-[hsl(var(--content-text))]">
            {assigned.map((person) => (
              <li key={person.id} className="inline-flex items-center gap-2">
                <PersonAvatar name={person.name} color={person.color} size="sm" />
                {person.name}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
};

