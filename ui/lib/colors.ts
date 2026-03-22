// Each palette entry is [bg, text, border] Tailwind classes.
// Strings are kept whole so the Tailwind CDN can detect them via DOM scanning.
const LIGHT_PALETTES: [string, string, string][] = [
  ["bg-blue-100",   "text-blue-700",   "border-blue-200"],
  ["bg-emerald-100","text-emerald-700","border-emerald-200"],
  ["bg-violet-100", "text-violet-700", "border-violet-200"],
  ["bg-amber-100",  "text-amber-700",  "border-amber-200"],
  ["bg-rose-100",   "text-rose-700",   "border-rose-200"],
  ["bg-cyan-100",   "text-cyan-700",   "border-cyan-200"],
  ["bg-orange-100", "text-orange-700", "border-orange-200"],
  ["bg-indigo-100", "text-indigo-700", "border-indigo-200"],
  ["bg-teal-100",   "text-teal-700",   "border-teal-200"],
  ["bg-pink-100",   "text-pink-700",   "border-pink-200"],
];

const DARK_PALETTES: [string, string, string][] = [
  ["bg-blue-900",    "text-blue-200",    "border-blue-700"],
  ["bg-emerald-900", "text-emerald-200", "border-emerald-700"],
  ["bg-violet-900",  "text-violet-200",  "border-violet-700"],
  ["bg-amber-900",   "text-amber-200",   "border-amber-700"],
  ["bg-rose-900",    "text-rose-200",    "border-rose-700"],
  ["bg-cyan-900",    "text-cyan-200",    "border-cyan-700"],
  ["bg-orange-900",  "text-orange-200",  "border-orange-700"],
  ["bg-indigo-900",  "text-indigo-200",  "border-indigo-700"],
  ["bg-teal-900",    "text-teal-200",    "border-teal-700"],
  ["bg-pink-900",    "text-pink-200",    "border-pink-700"],
];

// Accent bar colours — one solid bg class per slot, used for the card top stripe.
// Kept as full strings so the Tailwind CDN can detect them via static scanning.
const LIGHT_ACCENTS: string[] = [
  "bg-blue-400",
  "bg-emerald-400",
  "bg-violet-400",
  "bg-amber-400",
  "bg-rose-400",
  "bg-cyan-400",
  "bg-orange-400",
  "bg-indigo-400",
  "bg-teal-400",
  "bg-pink-400",
];

const DARK_ACCENTS: string[] = [
  "bg-blue-600",
  "bg-emerald-600",
  "bg-violet-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-cyan-600",
  "bg-orange-600",
  "bg-indigo-600",
  "bg-teal-600",
  "bg-pink-600",
];

/** Return a single solid background class for use as a card accent bar. */
export function tagAccentBg(category: string, dark = false): string {
  let h = 5381;
  for (let i = 0; i < category.length; i++) {
    h = ((h << 5) + h) ^ category.charCodeAt(i);
    h = h >>> 0;
  }
  const accents = dark ? DARK_ACCENTS : LIGHT_ACCENTS;
  return accents[h % accents.length];
}

/** Deterministically map a tag category name to a Tailwind colour triple. */
export function tagPalette(category: string, dark = false): [string, string, string] {
  // djb2 hash — stable, fast, good distribution
  let h = 5381;
  for (let i = 0; i < category.length; i++) {
    h = ((h << 5) + h) ^ category.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  const palettes = dark ? DARK_PALETTES : LIGHT_PALETTES;
  return palettes[h % palettes.length];
}
