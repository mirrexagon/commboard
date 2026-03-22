// 18 buckets at 20° spacing covers the full wheel with only clearly-named hues:
//   red, vermillion, orange, amber, yellow, yellow-green, chartreuse, green,
//   emerald, teal, cyan, sky, cornflower, blue, indigo, violet, magenta, rose.
// Stride 7 is coprime to 18, so adjacent bucket indices jump 7×20° = 140°,
// keeping numerically nearby hashes far apart on the wheel.
const N_HUES = 18;
const HUE_STEP = 20; // degrees between buckets
const HUE_STRIDE = 7;

/** Deterministically map a tag category name to a hue in [0, 360). */
function categoryHue(category: string): number {
  // djb2 hash — stable, fast, good distribution
  let h = 5381;
  for (let i = 0; i < category.length; i++) {
    h = ((h << 5) + h) ^ category.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  // Map to a bucket, then permute via stride so numerically nearby buckets
  // land on hues that are far apart on the wheel.
  const bucket = h % N_HUES;
  const spread = (bucket * HUE_STRIDE) % N_HUES;
  return spread * HUE_STEP;
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
