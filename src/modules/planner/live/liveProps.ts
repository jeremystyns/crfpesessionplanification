import type { CurrentDisplay } from '@/lib/playModeUtils';
import type { BlockType, Person, WorkshopItem } from '@/types/workshop';

/** Ce que la vue plein écran et la cellule flottante reçoivent du planificateur. */
export interface LiveViewProps {
  /** Jour qui tourne (plan sur plusieurs jours), sinon null. */
  dayLabel: string | null;
  display: CurrentDisplay;
  getElapsedMinutes: () => number;
  currentItem: WorkshopItem | null;
  currentType?: BlockType;
  /** Titre du groupe ou des sous-groupes qui contiennent l'élément en cours. */
  parentTitle: string | null;
  nextItem: WorkshopItem | null;
  nextType?: BlockType;
  persons: Person[];
  /** Lieu et salle de la journée. */
  dayLocation?: string;
  dayRoom?: string;
  soundsEnabled: boolean;
  soundPulse: number;
  /** Temps en pause. */
  isPaused: boolean;
  onTogglePause: () => void;
  /** Étape précédente / suivante (désactivées quand il n'y en a pas). */
  canPrevious: boolean;
  canNext: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToggleSounds: () => void;
  onExtend: () => void;
  onStop: () => void;
  onUpdateItem: (id: string, updates: Partial<WorkshopItem>) => void;
}
