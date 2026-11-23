/**
 * material — Liste de matériel à cocher, stockée dans le champ texte `material`.
 *
 * Une entrée par ligne : `[ ] Paperboards` (à préparer) ou `[x] Paperboards`
 * (prêt). Les lignes sans case sont lues comme des entrées à préparer, ce qui
 * garde les anciens contenus lisibles (texte libre, export CSV, import IA).
 */
export interface MaterialEntry {
  text: string;
  done: boolean;
}

const ENTRY_LINE = /^\s*(?:[-*•]\s+)?\[( |x|X)\]\s?(.*)$/;

export const parseMaterial = (value: string | undefined | null): MaterialEntry[] => {
  if (!value) return [];
  const entries: MaterialEntry[] = [];
  for (const line of value.split('\n')) {
    const match = ENTRY_LINE.exec(line);
    if (match) {
      entries.push({ done: match[1] !== ' ', text: match[2] });
    } else if (line.trim()) {
      entries.push({ done: false, text: line.trim() });
    }
  }
  return entries;
};

export const serializeMaterial = (entries: MaterialEntry[]): string =>
  entries.map((entry) => `[${entry.done ? 'x' : ' '}] ${entry.text}`).join('\n');

/** Retire les entrées vides (ligne ajoutée puis laissée blanche). */
export const cleanMaterial = (value: string | undefined | null): string =>
  serializeMaterial(parseMaterial(value).filter((entry) => entry.text.trim() !== ''));

/** Compte des entrées prêtes et du total (entrées vides ignorées). */
export const countMaterial = (value: string | undefined | null): { ready: number; total: number } => {
  const entries = parseMaterial(value).filter((entry) => entry.text.trim() !== '');
  return { ready: entries.filter((entry) => entry.done).length, total: entries.length };
};

/** Texte brut pour les exports : « ✓ » devant le matériel prêt. */
export const materialToPlainText = (value: string | undefined | null): string =>
  parseMaterial(value)
    .filter((entry) => entry.text.trim() !== '')
    .map((entry) => (entry.done ? `✓ ${entry.text}` : entry.text))
    .join('\n');
