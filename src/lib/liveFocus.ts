/**
 * liveFocus — Calculs d'affichage du mode Live (compte à rebours, urgence,
 * position de la cellule flottante). Fonctions pures, sans React.
 */

/** « 12:05 », ou « 1:02:05 » à partir d'une heure. Les secondes sont arrondies à l'entier supérieur. */
export const formatCountdown = (totalSeconds: number): string => {
  const total = Math.max(0, Math.ceil(totalSeconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
};

export type TimePressure = 'normal' | 'warning' | 'critical';

/**
 * Urgence du temps restant : la couleur du compte à rebours change quand la fin
 * approche (orange sous 2 minutes ou 25 % du temps, rouge sous 30 secondes).
 * Les éléments très courts (≤ 1 minute) restent en couleur normale pour ne pas
 * clignoter dès le départ.
 */
export const getTimePressure = (remainingSeconds: number, totalSeconds: number): TimePressure => {
  if (totalSeconds <= 60) return 'normal';
  if (remainingSeconds <= 30) return 'critical';
  if (remainingSeconds <= Math.min(120, totalSeconds * 0.25)) return 'warning';
  return 'normal';
};

/** Avancement d'un élément entre 0 et 1. */
export const getProgress = (elapsedSeconds: number, totalSeconds: number): number =>
  totalSeconds > 0 ? Math.min(1, Math.max(0, elapsedSeconds / totalSeconds)) : 0;

/** Heure d'horloge « HH:MM » à `secondsFromNow` secondes de `nowMs`. */
export const clockTimeAfter = (nowMs: number, secondsFromNow: number, locale = 'fr-FR'): string =>
  new Date(nowMs + secondsFromNow * 1000).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });

export interface Point {
  x: number;
  y: number;
}

/** Garde une cellule de `size` entièrement dans une fenêtre de `viewport` (marge `margin`). */
export const clampToViewport = (
  position: Point,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
  margin = 8,
): Point => ({
  x: Math.min(Math.max(margin, position.x), Math.max(margin, viewport.width - size.width - margin)),
  y: Math.min(Math.max(margin, position.y), Math.max(margin, viewport.height - size.height - margin)),
});

interface TitledNode {
  id: string;
  title: string;
  children?: TitledNode[];
}

/** Titres des conteneurs (groupe, sous-groupes) de l'élément `id`, du plus haut au plus proche. */
export const findAncestorTitles = (items: TitledNode[], id: string, trail: string[] = []): string[] | null => {
  for (const item of items) {
    if (item.id === id) return trail;
    const found = item.children ? findAncestorTitles(item.children, id, [...trail, item.title]) : null;
    if (found) return found;
  }
  return null;
};
