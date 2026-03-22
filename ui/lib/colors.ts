/** Deterministically map a tag category name to a hue in [0, 360). */
function categoryHue(category: string): number {
  // djb2 hash — stable, fast, good distribution
  let h = 5381;
  for (let i = 0; i < category.length; i++) {
    h = ((h << 5) + h) ^ category.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return h % 360;
}

export interface TagColors {
  bg: string;
  text: string;
  border: string;
}

/** Return inline-style HSL colors for a tag pill. */
export function tagPalette(category: string, dark = false): TagColors {
  const hue = categoryHue(category);
  if (dark) {
    return {
      bg: `hsl(${hue}, 40%, 20%)`,
      text: `hsl(${hue}, 75%, 78%)`,
      border: `hsl(${hue}, 45%, 30%)`,
    };
  }
  return {
    bg: `hsl(${hue}, 70%, 93%)`,
    text: `hsl(${hue}, 60%, 32%)`,
    border: `hsl(${hue}, 55%, 82%)`,
  };
}

/** Return an inline-style CSS color for the card accent bar. */
export function tagAccentColor(category: string, dark = false): string {
  const hue = categoryHue(category);
  return dark
    ? `hsl(${hue}, 55%, 48%)`
    : `hsl(${hue}, 65%, 60%)`;
}
