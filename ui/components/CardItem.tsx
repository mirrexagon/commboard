import { marked } from "marked";
import { useEffect, useRef, useState } from "preact/hooks";
import { tagAccentColor, tagPalette } from "../lib/colors.ts";
import { extractUrls } from "../lib/urls.ts";
import type { EmbedData } from "../../board.ts";

// ── Tag input with autocomplete ──────────────────────────────────────────────

interface TagInputProps {
  allTags: string[];
  existingTags: string[];
  onAdd: (tag: string) => void;
  onCancel: () => void;
}

function TagInput({ allTags, existingTags, onAdd, onCancel }: TagInputProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const suggestions =
    value.trim().length > 0
      ? allTags
          .filter(
            (t) =>
              !existingTags.includes(t) &&
              t.toLowerCase().includes(value.toLowerCase()),
          )
          .slice(0, 8)
      : [];

  function submit(tag: string) {
    const trimmed = tag.trim();
    const colon = trimmed.indexOf(":");
    if (colon > 0 && colon < trimmed.length - 1) {
      onAdd(trimmed);
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit(value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <div class="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onInput={(e) => setValue((e.target as HTMLInputElement).value)}
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
        placeholder="category:value"
        class={[
          "text-xs px-2.5 py-0.5 rounded-full border border-blue-400 outline-none",
          "w-36 bg-white dark:bg-gray-700",
          "text-gray-800 dark:text-gray-200",
          "placeholder-gray-400 dark:placeholder-gray-500",
        ].join(" ")}
        spellcheck={false}
      />
      {suggestions.length > 0 && (
        <div
          class={[
            "absolute top-full left-0 mt-1 z-50",
            "bg-white dark:bg-gray-800",
            "border border-gray-200 dark:border-gray-700",
            "rounded-lg shadow-lg overflow-hidden w-48",
          ].join(" ")}
        >
          {suggestions.map((tag) => (
            <button
              key={tag}
              class="block w-full text-left text-xs px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault();
                submit(tag);
              }}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Inline embed HTML generation ─────────────────────────────────────────────
//
// Embeds are rendered as raw HTML strings injected via dangerouslySetInnerHTML
// so that they live inside the card-prose div alongside the Markdown output.
// Event handling (refetch / fetch buttons) is done via event delegation on the
// parent div — see the onClick handler on .card-prose below.

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Produce the HTML string for a fully-fetched embed card.
 * Uses Tailwind classes for styling (CDN MutationObserver picks them up).
 */
function generateEmbedHtml(embed: EmbedData): string {
  const domain = (() => {
    try {
      return new URL(embed.url).hostname;
    } catch {
      return embed.url;
    }
  })();

  const fetchedDate = new Date(embed.fetched_at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const url = escapeHtml(embed.url);
  const borderCls = embed.error
    ? "border-red-200 dark:border-red-800"
    : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600";

  const imgHtml =
    !embed.error && embed.image_data
      ? `<img src="${embed.image_data}" alt="" loading="lazy" class="w-full max-h-36 object-cover">`
      : "";

  const faviconHtml = embed.favicon_data
    ? `<img src="${embed.favicon_data}" alt="" loading="lazy" class="w-3.5 h-3.5 rounded-sm shrink-0">`
    : `<span class="shrink-0 text-gray-400 dark:text-gray-500 text-xs">🔗</span>`;

  const siteLabel = escapeHtml(embed.site_name || domain);

  const bodyHtml = embed.error
    ? `<div class="text-xs text-red-500 dark:text-red-400">${escapeHtml("Failed: " + embed.error)}</div>`
    : [
        embed.title
          ? `<div class="text-xs font-semibold text-gray-800 dark:text-gray-200 leading-snug line-clamp-2">${escapeHtml(embed.title)}</div>`
          : "",
        embed.description
          ? `<div class="text-xs text-gray-500 dark:text-gray-400 leading-snug line-clamp-3">${escapeHtml(embed.description)}</div>`
          : "",
      ].join("");

  return (
    `<a href="${url}" target="_blank" rel="noopener noreferrer" ` +
    `class="card-embed block rounded-lg border ${borderCls} overflow-hidden transition-colors duration-150 my-2">` +
    imgHtml +
    `<div class="px-3 py-2 flex flex-col gap-0.5">` +
    `<div class="flex items-center gap-1.5 min-w-0">` +
    faviconHtml +
    `<span class="text-xs text-gray-500 dark:text-gray-400 truncate flex-1 min-w-0">${siteLabel}</span>` +
    `<button data-refetch-url="${url}" ` +
    `class="shrink-0 text-xs text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer px-1 ml-auto" ` +
    `title="Refetch embed">↺</button>` +
    `</div>` +
    bodyHtml +
    `<div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Fetched ${escapeHtml(fetchedDate)}</div>` +
    `</div>` +
    `</a>`
  );
}

/**
 * Produce a small inline button that, when clicked, fetches the embed for
 * a URL that has no cached data yet.
 */
function generateFetchButtonHtml(url: string): string {
  const escaped = escapeHtml(url);
  return (
    `<button data-fetch-url="${escaped}" ` +
    `class="text-xs text-blue-400 hover:text-blue-600 dark:text-blue-500 dark:hover:text-blue-300 ` +
    `cursor-pointer align-baseline ml-1 transition-colors duration-100" ` +
    `title="Fetch embed for ${escaped}">↓ embed</button>`
  );
}

/**
 * Post-process a block of marked HTML to inject embed previews and fetch
 * buttons inline.
 *
 * Pass 1 — for every `<a href="https://…">` whose URL is NOT yet cached,
 *           append a small inline "↓ embed" button right after the </a>.
 *
 * Pass 2 — for every block element (p, h1–h6, li, blockquote) that
 *           contains a link whose URL IS cached, append the full embed card
 *           immediately after the closing tag of that block element.
 *           Placing the embed after the block (rather than mid-paragraph)
 *           keeps the HTML valid and the surrounding text intact.
 *
 * Both passes deduplicate: each unique URL gets at most one button / preview.
 */
function injectEmbedsIntoHtml(
  html: string,
  embedCache: Record<string, EmbedData>,
): string {
  const seenFetch = new Set<string>();
  const seenEmbed = new Set<string>();

  // Pass 1: inline fetch buttons for uncached URLs.
  let result = html.replace(
    /<a\b[^>]*\bhref="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<\/a>/g,
    (match, href) => {
      if (href in embedCache || seenFetch.has(href)) return match;
      seenFetch.add(href);
      return match + generateFetchButtonHtml(href);
    },
  );

  // Pass 2: block embed cards after block elements containing cached URLs.
  // The backreference \1 ensures the opening and closing tags match.
  result = result.replace(
    /<(p|h[1-6]|li|blockquote)\b[^>]*>[\s\S]*?<\/\1>/g,
    (blockMatch) => {
      const embeds: string[] = [];
      const linkRe = /\bhref="(https?:\/\/[^"]+)"/g;
      let m: RegExpExecArray | null;
      while ((m = linkRe.exec(blockMatch)) !== null) {
        const href = m[1];
        if (seenEmbed.has(href) || !(href in embedCache)) continue;
        seenEmbed.add(href);
        embeds.push(generateEmbedHtml(embedCache[href] as EmbedData));
      }
      return embeds.length ? blockMatch + embeds.join("") : blockMatch;
    },
  );

  return result;
}

// ── CardItem ─────────────────────────────────────────────────────────────────

export interface Card {
  id: number;
  text: string;
  tags: string[];
}

interface ParsedTag {
  category: string;
  value: string;
  raw: string;
}

function parseTag(raw: string): ParsedTag {
  const colon = raw.indexOf(":");
  if (colon === -1) return { category: raw, value: "", raw };
  return { category: raw.slice(0, colon), value: raw.slice(colon + 1), raw };
}

interface Props {
  card: Card;
  allTags: string[];
  darkMode: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  isDragDisabled?: boolean;
  /** Board-level embed cache, keyed by URL. */
  embedCache: Record<string, EmbedData>;
  onDelete: () => void;
  onUpdate: (text: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  onFetchEmbed: (url: string, refetch: boolean) => void;
  onDragStart: (e: DragEvent) => void;
  onDragEnter: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
  onDragEnd: (e: DragEvent) => void;
}

export function CardItem({
  card,
  allTags,
  darkMode,
  isDragging,
  isDropTarget,
  isDragDisabled = false,
  embedCache,
  onDelete,
  onUpdate,
  onAddTag,
  onRemoveTag,
  onFetchEmbed,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDrop,
  onDragEnd,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [draft, setDraft] = useState(card.text);
  const dragDisabled = editing || addingTag || isDragDisabled;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!editing) setDraft(card.text);
  }, [card.text, editing]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      autoResize(el);
      el.focus();
      el.selectionStart = el.selectionEnd = el.value.length;
    }
  }, [editing]);

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }

  function startEditing() {
    setDraft(card.text);
    setEditing(true);
  }

  function commit() {
    const trimmed = draft.trim();
    if (!trimmed) {
      cancel();
      return;
    }
    setEditing(false);
    if (trimmed !== card.text) onUpdate(trimmed);
  }

  function cancel() {
    setDraft(card.text);
    setEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") { e.preventDefault(); cancel(); }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); commit(); }
  }

  function handleInput(e: Event) {
    const el = e.target as HTMLTextAreaElement;
    setDraft(el.value);
    autoResize(el);
  }

  /**
   * Handle clicks inside the card-prose div via event delegation.
   * Buttons injected as raw HTML (embed refetch / fetch) are caught here;
   * all other clicks enter edit mode as before.
   */
  function handleProseClick(e: MouseEvent) {
    const target = e.target as Element;

    // ↺ Refetch button on an existing embed.
    // preventDefault stops the parent <a> (the embed card) from navigating.
    const refetchBtn = target.closest("[data-refetch-url]");
    if (refetchBtn) {
      e.preventDefault();
      onFetchEmbed(refetchBtn.getAttribute("data-refetch-url")!, true);
      return;
    }

    // "↓ embed" fetch button for an uncached URL.
    const fetchBtn = target.closest("[data-fetch-url]");
    if (fetchBtn) {
      e.preventDefault();
      onFetchEmbed(fetchBtn.getAttribute("data-fetch-url")!, false);
      return;
    }

    // Clicking anywhere on the embed card itself opens the link (native <a>
    // behaviour) — don't also enter edit mode.
    if (target.closest(".card-embed")) return;

    startEditing();
  }

  const rawHtml = marked.parse(card.text) as string;
  const html = injectEmbedsIntoHtml(rawHtml, embedCache);

  // Used for the per-card "Fetch N embeds" button.
  const uncachedUrls = extractUrls(card.text).filter((u) => !(u in embedCache));

  const tags = [...card.tags].sort().map(parseTag);
  const accentCategories = [...new Set(tags.map((t) => t.category))];
  const neutralAccentColor = darkMode ? "#374151" : "#e5e7eb";

  return (
    <div
      class={[
        "group bg-white dark:bg-gray-800 rounded-xl shadow-sm",
        "flex flex-col min-w-0",
        "transition-all duration-150",
        editing
          ? "ring-2 ring-blue-400 ring-offset-1 shadow-md"
          : isDropTarget
            ? "ring-2 ring-blue-500 ring-offset-2 shadow-lg"
            : "ring-1 ring-black/[0.07] dark:ring-white/[0.08] hover:shadow-md",
        isDragging ? "opacity-40" : "",
        editing || isDragDisabled ? "cursor-default" : "cursor-grab active:cursor-grabbing select-none",
      ].join(" ")}
      draggable={!dragDisabled}
      onDragStart={dragDisabled ? undefined : onDragStart}
      onDragEnter={dragDisabled ? undefined : onDragEnter}
      onDragOver={dragDisabled ? undefined : onDragOver}
      onDrop={dragDisabled ? undefined : onDrop}
      onDragEnd={dragDisabled ? undefined : onDragEnd}
    >
      {/* ── Accent bar ── */}
      <div class="h-1.5 rounded-t-xl flex overflow-hidden">
        {accentCategories.length > 0 ? (
          accentCategories.map((cat) => (
            <div
              key={cat}
              class="flex-1 transition-colors duration-200"
              style={{ backgroundColor: tagAccentColor(cat, darkMode) }}
            />
          ))
        ) : (
          <div class="flex-1" style={{ backgroundColor: neutralAccentColor }} />
        )}
      </div>

      {/* ── Card header row: #ID | spacer | edit + delete ── */}
      <div class="flex items-center px-2 pt-1 pb-0.5 min-w-0">
        <span class="w-6 h-6 flex items-center justify-center text-xs text-gray-400 dark:text-gray-500 font-mono select-none leading-none shrink-0">
          #{card.id}
        </span>
        <div class="flex-1" />
        {!editing && (
          <div
            class={[
              "flex gap-1",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-100",
              isDragging ? "!opacity-0" : "",
            ].join(" ")}
          >
            <button
              class="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors duration-100 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); startEditing(); }}
              title="Edit card (click body to edit too)"
              aria-label="Edit card"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5">
                <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.776a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.263-4.264a1.75 1.75 0 0 0 0-2.474Z" />
                <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9a.75.75 0 0 1 1.5 0v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
              </svg>
            </button>
            <button
              class="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors duration-100 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Delete card"
              aria-label="Delete card"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5">
                <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* ── Card body ── */}
      {editing ? (
        <div class="flex flex-col flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            class={[
              "w-full resize-none overflow-hidden",
              "px-4 pt-2 pb-2",
              "min-h-[4rem]",
              "bg-transparent outline-none",
              "font-mono text-sm leading-relaxed",
              "text-gray-800 dark:text-gray-200",
              "placeholder-gray-400 dark:placeholder-gray-500",
            ].join(" ")}
            value={draft}
            onInput={handleInput}
            onKeyDown={handleKeyDown}
            onBlur={commit}
            placeholder="Card text (Markdown supported)…"
            rows={1}
            spellcheck={false}
          />
          <p class="px-4 pb-3 text-xs text-gray-400 dark:text-gray-500 select-none pointer-events-none">
            Ctrl+Enter to save · Esc to cancel
          </p>
        </div>
      ) : (
        /* View mode.
           handleProseClick uses event delegation to distinguish clicks on
           injected embed buttons from clicks that should enter edit mode. */
        <div
          class="card-prose px-4 pt-1 pb-2 flex-1 min-w-0 break-words cursor-text"
          title="Click to edit"
          onClick={handleProseClick}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}

      {/* ── Per-card "Fetch all missing embeds" shortcut ── */}
      {!editing && uncachedUrls.length > 0 && (
        <div class="px-4 pb-1" onClick={(e) => e.stopPropagation()}>
          <button
            class={[
              "text-xs text-blue-400 hover:text-blue-600",
              "dark:text-blue-500 dark:hover:text-blue-300",
              "transition-colors duration-100 cursor-pointer",
            ].join(" ")}
            onClick={() => uncachedUrls.forEach((u) => onFetchEmbed(u, false))}
          >
            Fetch {uncachedUrls.length === 1 ? "1 embed" : `${uncachedUrls.length} embeds`}…
          </button>
        </div>
      )}

      {/* ── Tags ── */}
      <div
        class={[
          "px-4 pb-3 pt-2 flex flex-wrap gap-1.5 items-center",
          tags.length > 0 || addingTag
            ? "border-t border-gray-100 dark:border-gray-700"
            : "",
        ].join(" ")}
      >
        {tags.map(({ category, value, raw }) => {
          const { bg, text, border } = tagPalette(category, darkMode);
          return (
            <span
              key={raw}
              class="group/tag inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium"
              style={{ backgroundColor: bg, color: text, borderColor: border }}
            >
              <span class="opacity-50 font-normal">{category}</span>
              {value && <span>{value}</span>}
              {!editing && (
                <button
                  class="ml-0.5 opacity-0 group-hover/tag:opacity-100 transition-opacity duration-100 hover:text-red-500 leading-none cursor-pointer"
                  title={`Remove tag "${raw}"`}
                  aria-label={`Remove tag ${raw}`}
                  onClick={(e) => { e.stopPropagation(); onRemoveTag(raw); }}
                >
                  ×
                </button>
              )}
            </span>
          );
        })}

        {!editing && (
          addingTag ? (
            <TagInput
              allTags={allTags}
              existingTags={card.tags}
              onAdd={(tag) => { setAddingTag(false); onAddTag(tag); }}
              onCancel={() => setAddingTag(false)}
            />
          ) : (
            <button
              class={[
                "text-xs px-2 py-0.5 rounded-full border border-dashed",
                "border-gray-300 dark:border-gray-600",
                "text-gray-400 dark:text-gray-500",
                "hover:text-blue-500 hover:border-blue-400",
                "transition-colors duration-100 cursor-pointer",
                tags.length > 0
                  ? "opacity-0 group-hover:opacity-100"
                  : "opacity-60 group-hover:opacity-100",
              ].join(" ")}
              title="Add tag"
              aria-label="Add tag"
              onClick={(e) => { e.stopPropagation(); setAddingTag(true); }}
            >
              + tag
            </button>
          )
        )}
      </div>
    </div>
  );
}
