import { createContext } from 'react';

export interface LiveStartValue {
  /** Un live est en cours : le bouton d'un élément y déplace alors le direct au lieu de le lancer. */
  isLive: boolean;
  /** Lance le live à partir de l'élément (ou s'y rend si le live tourne déjà). */
  startFrom: (itemId: string) => void;
}

/** Fourni par le planificateur ; sans fournisseur, les éléments n'affichent pas le bouton « Live ». */
export const LiveStartContext = createContext<LiveStartValue | null>(null);
