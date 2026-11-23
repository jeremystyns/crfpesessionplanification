import { useTheme } from 'next-themes';
import { readableOn } from '@/lib/color-contrast';

/** Fonds de carte (clair / sombre) sur lesquels le titre doit rester lisible. */
const CARD_LIGHT = '#ffffff';
const CARD_DARK = '#12202e';

/**
 * Couleur du titre d'un élément, alignée sur la couleur de son type de bloc
 * mais assombrie (ou éclaircie en mode sombre) au besoin pour rester lisible.
 * Retourne undefined sans type : le titre garde alors la couleur du texte.
 */
export const useTypeTitleColor = (typeColor?: string | null): string | undefined => {
  const { resolvedTheme } = useTheme();
  if (!typeColor) return undefined;
  return readableOn(typeColor, resolvedTheme === 'dark' ? CARD_DARK : CARD_LIGHT);
};
