/**
 * CalendarLeaf — La date du jour sous forme de feuillet de calendrier perpétuel :
 * bandeau du mois, grand numéro du jour, jour de la semaine et année.
 * Un clic ouvre le sélecteur de date de l'en-tête.
 * Used by: WorkshopDescription
 */
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

interface CalendarLeafProps {
  /** Date ISO (AAAA-MM-JJ). */
  date: string;
  className?: string;
}

export const CalendarLeaf = ({ date, className }: CalendarLeafProps) => {
  const { t, i18n } = useTranslation('common');
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;

  const locale = i18n.language || 'fr';
  const month = parsed.toLocaleDateString(locale, { month: 'short' }).replace('.', '');
  const weekday = parsed.toLocaleDateString(locale, { weekday: 'long' });
  const fullDate = parsed.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <button
      type="button"
      title={`${fullDate} — ${t('planner.datePlaceholder')}`}
      aria-label={fullDate}
      onClick={() => document.querySelector<HTMLElement>('[data-date-trigger]')?.click()}
      className={cn(
        'group/leaf relative block w-[5.25rem] shrink-0 select-none rounded-md text-center transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 print:hover:translate-y-0',
        // Pile de feuillets derrière celui du dessus.
        'shadow-[0_1px_0_hsl(var(--border)),0_3px_0_-1px_hsl(var(--card)),0_4px_0_-1px_hsl(var(--border)),0_6px_0_-2px_hsl(var(--card)),0_7px_0_-2px_hsl(var(--border)),0_8px_12px_-4px_rgb(0_0_0/0.18)]',
        className,
      )}
    >
      <time dateTime={date} className="block overflow-hidden rounded-md border bg-card">
        <span className="relative block bg-primary px-1 pb-0.5 pt-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-primary-foreground">
          {/* Anneaux de la reliure */}
          <span aria-hidden className="absolute left-2.5 top-0.5 h-1.5 w-1.5 rounded-full bg-primary-foreground/70" />
          <span aria-hidden className="absolute right-2.5 top-0.5 h-1.5 w-1.5 rounded-full bg-primary-foreground/70" />
          {month}
        </span>
        <span className="block pt-1 text-[2rem] font-extrabold leading-none tabular-nums text-[hsl(var(--content-text))]">
          {parsed.getDate()}
        </span>
        <span className="block px-1 text-[11px] font-bold uppercase tracking-wide text-[hsl(var(--content-subtitle))]">
          {weekday}
        </span>
        <span className="block pb-1.5 text-[10px] font-medium tabular-nums text-muted-foreground">
          {parsed.getFullYear()}
        </span>
      </time>
    </button>
  );
};
