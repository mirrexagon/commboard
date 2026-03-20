// Each palette entry is [bg, text, border] Tailwind classes.
// Strings are kept whole so the Tailwind CDN can detect them via DOM scanning.
const PALETTES: [string, string, string][] = [
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

/** Deterministically map a tag category name to a Tailwind colour triple. */
export function tagPalette(category: string): [string, string, string] {
  // djb2 hash — stable, fast, good distribution
  let h = 5381;
  for (let i = 0; i < category.length; i++) {
    h = ((h << 5) + h) ^ category.charCodeAt(i);
    h = h >>> 0; // keep unsigned 32-bit
  }
  return PALETTES[h % PALETTES.length];
}
