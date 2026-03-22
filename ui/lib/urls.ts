/**
 * Extract all http/https URLs from a block of text (e.g. Markdown).
 * Strips trailing punctuation that is unlikely to be part of the URL.
 * Returns a de-duplicated array preserving first-seen order.
 */
export function extractUrls(text: string): string[] {
    const raw = text.match(/https?:\/\/[^\s\)\]\>"'`\\]+/g) ?? [];
    const cleaned = raw.map((u) => u.replace(/[.,;:!?'")\]>]+$/, ""));
    return [...new Set(cleaned)];
}
