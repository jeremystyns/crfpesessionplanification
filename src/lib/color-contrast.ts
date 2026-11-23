/** Choose a readable foreground without changing a saved category/person color. */
export const getContrastingTextColor = (color: string): '#000000' | '#ffffff' => {
  const hex = color.replace(/^#/, '');
  const expanded = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  if (!/^[\da-f]{6}$/i.test(expanded)) return '#000000';
  const channels = [0, 2, 4].map((offset) => {
    const channel = parseInt(expanded.slice(offset, offset + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  return (luminance + 0.05) / 0.05 >= 1.05 / (luminance + 0.05) ? '#000000' : '#ffffff';
};

const toRgb = (color: string): [number, number, number] | null => {
  const hex = color.replace(/^#/, '');
  const expanded = hex.length === 3 ? [...hex].map((c) => c + c).join('') : hex;
  if (!/^[\da-f]{6}$/i.test(expanded)) return null;
  return [0, 2, 4].map((offset) => parseInt(expanded.slice(offset, offset + 2), 16)) as [number, number, number];
};

const relativeLuminance = ([r, g, b]: [number, number, number]): number => {
  const [lr, lg, lb] = [r, g, b].map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return lr * 0.2126 + lg * 0.7152 + lb * 0.0722;
};

export const contrastRatio = (a: [number, number, number], b: [number, number, number]): number => {
  const [la, lb] = [relativeLuminance(a), relativeLuminance(b)];
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
};

const toHex = (rgb: number[]): string => `#${rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')}`;

/**
 * Teinte de `color` lisible sur `background` (contraste >= `minRatio`).
 * On mélange la couleur du type avec du noir (fond clair) ou du blanc
 * (fond sombre) jusqu'à atteindre le contraste, sans changer la couleur
 * enregistrée : un cyan reste reconnaissable sans devenir illisible.
 */
export const readableOn = (color: string, background: string, minRatio = 4.5): string => {
  const fg = toRgb(color);
  const bg = toRgb(background);
  if (!fg || !bg) return color;
  const target: [number, number, number] = relativeLuminance(bg) > 0.4 ? [0, 0, 0] : [255, 255, 255];
  for (let step = 0; step <= 20; step += 1) {
    const mix = step / 20;
    const candidate = fg.map((value, i) => value + (target[i] - value) * mix);
    if (contrastRatio(candidate as [number, number, number], bg) >= minRatio) return toHex(candidate);
  }
  return toHex(target);
};
