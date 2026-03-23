import { marked } from "marked";
import { useEffect, useRef, useState } from "preact/hooks";
import { tagAccentColor, tagPalette } from "../lib/colors.ts";
import { extractUrls } from "../lib/urls.ts";
import type { EmbedData, EmbeddedFile } from "../../board.ts";

// ── Tag input with autocomplete ──────────────────────────────────────────────

interface TagInputProps {
  allTags: string[];
  tagCounts: Record<string, number>;
  existingTags: string[];
  onAdd: (tag: string) => void;
  onCancel: () => void;
}

function TagInput({ allTags, tagCounts, existingTags, onAdd, onCancel }: TagInputProps) {
  const [value, setValue] = useState("");
  const [activeIndex, setActiveIndex] = useState(-1);
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
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        submit(suggestions[activeIndex]);
      } else {
        submit(value);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  function handleInput(e: Event) {
    setValue((e.target as HTMLInputElement).value);
    setActiveIndex(-1);
  }

  return (
    <div class="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onInput={handleInput}
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
          {suggestions.map((tag, i) => (
            <button
              key={tag}
              class={[
                "flex items-center gap-2 w-full text-left text-xs px-3 py-1.5 text-gray-700 dark:text-gray-300 cursor-pointer",
                i === activeIndex
                  ? "bg-blue-100 dark:bg-blue-900/50"
                  : "hover:bg-blue-50 dark:hover:bg-blue-900/30",
              ].join(" ")}
              onMouseDown={(e) => {
                e.preventDefault();
                submit(tag);
              }}
            >
              <span class="flex-1">{tag}</span>
              <span class="text-gray-400 dark:text-gray-500 font-mono tabular-nums">
                {tagCounts[tag] ?? 0}
              </span>
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

/** Return an emoji icon for a MIME type. */
function fileIcon(mimeType: string | undefined): string {
  if (!mimeType) return "📎";
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.startsWith("text/")) return "📝";
  return "📎";
}

/**
 * Produce the HTML string for a fully-fetched external embed card.
 * Uses Tailwind classes for styling (CDN MutationObserver picks them up).
 *
 * If `embed.content_type` is set and is not text/html, the resource is a
 * direct file download and is rendered as a file card (labelled "File").
 * Otherwise it is rendered as a rich link preview (labelled "Embed").
 */
function generateEmbedHtml(embed: EmbedData): string {
  const url = escapeHtml(embed.url);
  const borderCls = embed.error
    ? "border-red-200 dark:border-red-800"
    : "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600";

  const fetchedDate = new Date(embed.fetched_at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  // ── Direct file download (non-HTML content-type) ──────────────────────────
  const isDirectFile =
    !!embed.content_type && !embed.content_type.includes("text/html");

  if (isDirectFile) {
    const isImage = embed.content_type!.startsWith("image/");
    const isAudio = embed.content_type!.startsWith("audio/");
    const icon = fileIcon(embed.content_type);
    const filename = escapeHtml(
      embed.title ?? new URL(embed.url).pathname.split("/").filter(Boolean).pop() ?? embed.url,
    );

    // Audio: <div> wrapper so native controls don't fight link navigation.
    if (isAudio) {
      return (
        `<div class="card-embed block rounded-lg border ${borderCls} overflow-hidden transition-colors duration-150 my-2">` +
        `<audio controls src="${url}" class="w-full block px-3 pt-2 pb-1"></audio>` +
        `<div class="px-3 py-2 flex items-center gap-1.5 min-w-0">` +
        `<span class="text-base leading-none select-none shrink-0">${icon}</span>` +
        `<span class="text-xs text-gray-500 dark:text-gray-400 truncate flex-1 min-w-0">${filename}</span>` +
        `<a href="${url}" target="_blank" rel="noopener noreferrer" ` +
        `class="shrink-0 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 text-xs px-1" ` +
        `title="Open in new tab">↗</a>` +
        `<button data-refetch-url="${url}" ` +
        `class="shrink-0 text-xs text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer px-1" ` +
        `title="Refetch">↺</button>` +
        `<span class="shrink-0 text-xs text-gray-400 dark:text-gray-500 font-medium">File</span>` +
        `</div>` +
        `</div>`
      );
    }

    // Image: thumbnail banner loaded directly from the URL.
    const imageHtml = isImage
      ? `<img src="${url}" alt="${filename}" loading="lazy" ` +
        `class="w-full max-h-48 object-contain bg-gray-50 dark:bg-gray-900">`
      : "";

    return (
      `<a href="${url}" target="_blank" rel="noopener noreferrer" ` +
      `class="card-embed block rounded-lg border ${borderCls} overflow-hidden transition-colors duration-150 my-2">` +
      imageHtml +
      `<div class="px-3 py-2 flex items-center gap-1.5 min-w-0">` +
      `<span class="text-base leading-none select-none shrink-0">${icon}</span>` +
      `<span class="text-xs text-gray-500 dark:text-gray-400 truncate flex-1 min-w-0">${filename}</span>` +
      `<button data-refetch-url="${url}" ` +
      `class="shrink-0 text-xs text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer px-1" ` +
      `title="Refetch">↺</button>` +
      `<span class="shrink-0 text-xs text-gray-400 dark:text-gray-500 font-medium">File</span>` +
      `</div>` +
      `</a>`
    );
  }

  // ── HTML page embed (rich preview) ───────────────────────────────────────
  const domain = (() => {
    try {
      return new URL(embed.url).hostname;
    } catch {
      return embed.url;
    }
  })();

  const encodedEmbedUrl = encodeURIComponent(embed.url);

  const imgHtml =
    !embed.error && embed.image_cached
      ? `<img src="/api/embeds/image?url=${encodedEmbedUrl}" alt="" loading="lazy" class="w-full max-h-36 object-cover">`
      : "";

  const faviconHtml = embed.favicon_cached
    ? `<img src="/api/embeds/favicon?url=${encodedEmbedUrl}" alt="" loading="lazy" class="w-3.5 h-3.5 rounded-sm shrink-0">`
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
    `<span class="shrink-0 text-xs text-gray-400 dark:text-gray-500 font-medium">Embed</span>` +
    `<button data-refetch-url="${url}" ` +
    `class="shrink-0 text-xs text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 cursor-pointer px-1 ml-1" ` +
    `title="Refetch embed">↺</button>` +
    `</div>` +
    bodyHtml +
    `<div class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Fetched ${escapeHtml(fetchedDate)}</div>` +
    `</div>` +
    `</a>`
  );
}

/**
 * Produce the HTML string for an embedded-file card (a file stored in the
 * board's virtual filesystem, served under /files/).
 *
 * - Images  → card wrapping an <img> thumbnail; clicking opens the file.
 * - Audio   → card with a native <audio> player + separate open-in-tab link.
 * - Others  → plain card showing the filename; clicking opens the file.
 *
 * All variants are labelled "File" and carry the `card-embed` class so that
 * the prose click handler does not accidentally enter edit mode.
 */
function generateFileEmbedHtml(
  href: string,
  filePath: string,
  mimeType: string | undefined,
): string {
  const escapedHref = escapeHtml(href);
  const escapedPath = escapeHtml(filePath);
  const filename = escapeHtml(filePath.split("/").pop() ?? filePath);
  const icon = fileIcon(mimeType);
  const isImage = mimeType?.startsWith("image/") ?? false;
  const isAudio = mimeType?.startsWith("audio/") ?? false;
  const borderCls =
    "border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600";

  // Audio: use a <div> wrapper (not <a>) so the native controls don't fight
  // with link-navigation. Include an explicit open-in-tab button.
  if (isAudio) {
    return (
      `<div class="card-embed block rounded-lg border ${borderCls} overflow-hidden transition-colors duration-150 my-2">` +
      `<audio controls src="${escapedHref}" class="w-full block px-3 pt-2 pb-1"></audio>` +
      `<div class="px-3 py-2 flex items-center gap-1.5 min-w-0">` +
      `<span class="text-base leading-none select-none shrink-0">${icon}</span>` +
      `<span class="text-xs text-gray-500 dark:text-gray-400 truncate flex-1 min-w-0" title="${escapedPath}">${filename}</span>` +
      `<a href="${escapedHref}" target="_blank" rel="noopener noreferrer" ` +
      `class="shrink-0 text-gray-400 hover:text-blue-500 dark:hover:text-blue-400 text-xs px-1" ` +
      `title="Open in new tab">↗</a>` +
      `<span class="shrink-0 text-xs text-gray-400 dark:text-gray-500 font-medium">File</span>` +
      `</div>` +
      `</div>`
    );
  }

  // Image: show a thumbnail banner at the top of the card.
  const imageHtml = isImage
    ? `<img src="${escapedHref}" alt="${filename}" loading="lazy" ` +
      `class="w-full max-h-48 object-contain bg-gray-50 dark:bg-gray-900">`
    : "";

  return (
    `<a href="${escapedHref}" target="_blank" rel="noopener noreferrer" ` +
    `class="card-embed block rounded-lg border ${borderCls} overflow-hidden transition-colors duration-150 my-2">` +
    imageHtml +
    `<div class="px-3 py-2 flex items-center gap-1.5 min-w-0">` +
    `<span class="text-base leading-none select-none shrink-0">${icon}</span>` +
    `<span class="text-xs text-gray-500 dark:text-gray-400 truncate flex-1 min-w-0" title="${escapedPath}">${filename}</span>` +
    `<span class="shrink-0 text-xs text-gray-400 dark:text-gray-500 font-medium">File</span>` +
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
 * Post-process a block of marked HTML to inject embed previews, fetch
 * buttons, and file embed cards inline.
 *
 * Pass 1 — for every `<a href="https://…">` whose URL is NOT yet cached,
 *           append a small inline "↓ embed" button right after the </a>.
 *
 * Pass 2 — for every block element (p, h1–h6, li, blockquote) that
 *           contains an external link whose URL IS cached, append the full
 *           embed card immediately after the closing tag of that block.
 *
 * Pass 3 — for every block element that contains a `/files/…` link, append
 *           a file embed card immediately after the closing tag.
 *
 * All passes deduplicate: each unique URL/path gets at most one card.
 * Cards are placed after the block element (not mid-paragraph) to keep the
 * generated HTML valid.
 */
function injectEmbedsIntoHtml(
  html: string,
  embedCache: Record<string, EmbedData>,
  embeddedFiles: Record<string, EmbeddedFile>,
): string {
  // seenFetch deduplicates fetch buttons only: one "↓ embed" button per
  // uncached URL is sufficient regardless of how many times it appears.
  // Embed/file cards are NOT deduplicated — every occurrence of a URL gets
  // its own card so that links used in multiple places all render inline.
  const seenFetch = new Set<string>();

  // Pass 1: inline fetch buttons for uncached external URLs.
  let result = html.replace(
    /<a\b[^>]*\bhref="(https?:\/\/[^"]+)"[^>]*>[\s\S]*?<\/a>/g,
    (match, href) => {
      if (href in embedCache || seenFetch.has(href)) return match;
      seenFetch.add(href);
      return match + generateFetchButtonHtml(href);
    },
  );

  // Pass 2: external embed/file cards after block elements containing cached URLs.
  result = result.replace(
    /<(p|h[1-6]|li|blockquote)\b[^>]*>[\s\S]*?<\/\1>/g,
    (blockMatch) => {
      const embeds: string[] = [];
      const linkRe = /\bhref="(https?:\/\/[^"]+)"/g;
      let m: RegExpExecArray | null;
      while ((m = linkRe.exec(blockMatch)) !== null) {
        const href = m[1];
        if (!(href in embedCache)) continue;
        embeds.push(generateEmbedHtml(embedCache[href] as EmbedData));
      }
      return embeds.length ? blockMatch + embeds.join("") : blockMatch;
    },
  );

  // Pass 3: file embed cards after block elements containing /files/… links.
  result = result.replace(
    /<(p|h[1-6]|li|blockquote)\b[^>]*>[\s\S]*?<\/\1>/g,
    (blockMatch) => {
      const fileEmbeds: string[] = [];
      const linkRe = /\bhref="(\/files\/([^"]+))"/g;
      let m: RegExpExecArray | null;
      while ((m = linkRe.exec(blockMatch)) !== null) {
        const href = m[1];
        const encodedPath = m[2];
        const filePath = decodeURIComponent(encodedPath);
        const file = embeddedFiles[filePath];
        fileEmbeds.push(generateFileEmbedHtml(href, filePath, file?.mime_type));
      }
      return fileEmbeds.length ? blockMatch + fileEmbeds.join("") : blockMatch;
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
  tagCounts: Record<string, number>;
  darkMode: boolean;
  isDragging: boolean;
  isDropTarget: boolean;
  isDragDisabled?: boolean;
  /** Board-level embed cache, keyed by URL. */
  embedCache: Record<string, EmbedData>;
  /** Board-level embedded files registry, keyed by file path. */
  embeddedFiles: Record<string, EmbeddedFile>;
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
  tagCounts,
  darkMode,
  isDragging,
  isDropTarget,
  isDragDisabled = false,
  embedCache,
  embeddedFiles,
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
  const [deletingTagIndex, setDeletingTagIndex] = useState<number | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [draft, setDraft] = useState(card.text);
  const dragDisabled = editing || addingTag || isDragDisabled;
  const cardRef = useRef<HTMLDivElement>(null);
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

  // Tags array (sorted) — used by key handlers and render alike.
  const tags = [...card.tags].sort().map(parseTag);

  // ── Focus tracking ──────────────────────────────────────────────────────────

  function handleFocus() {
    setIsFocused(true);
  }

  function handleBlur(e: FocusEvent) {
    // Stay "focused" when focus moves to a child element (e.g. textarea, TagInput).
    const related = e.relatedTarget as Element | null;
    if (cardRef.current && related && cardRef.current.contains(related)) return;
    setIsFocused(false);
    setDeletingTagIndex(null);
  }

  // ── Card-level keyboard shortcuts ───────────────────────────────────────────

  function handleCardKeyDown(e: KeyboardEvent) {
    // Let modifier-key combos (browser shortcuts, Ctrl+Enter save, etc.) pass through.
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    // Let the textarea / tag-input handle their own events.
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    if (editing || addingTag) return;

    if (deletingTagIndex !== null) {
      // ── Delete-tag mode navigation ──
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setDeletingTagIndex((i) => Math.min((i ?? 0) + 1, tags.length - 1));
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setDeletingTagIndex((i) => Math.max((i ?? 0) - 1, 0));
      } else if (e.key === "Enter" || e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        const idx = deletingTagIndex;
        if (idx >= 0 && idx < tags.length) {
          const tagToRemove = tags[idx].raw;
          const newCount = tags.length - 1;
          setDeletingTagIndex(newCount === 0 ? null : Math.min(idx, newCount - 1));
          onRemoveTag(tagToRemove);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        setDeletingTagIndex(null);
      }
      return;
    }

    // ── Normal-mode shortcuts ──
    if (e.key === "Enter") {
      e.preventDefault();
      startEditing();
    } else if (e.key === "a" || e.key === "A") {
      e.preventDefault();
      setAddingTag(true);
    } else if ((e.key === "d" || e.key === "D") && tags.length > 0) {
      e.preventDefault();
      setDeletingTagIndex(0);
    }
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
    cardRef.current?.focus();
  }

  function cancel() {
    setDraft(card.text);
    setEditing(false);
    cardRef.current?.focus();
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
   * Catches the embed refetch / fetch buttons injected as raw HTML.
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
  }

  const rawHtml = marked.parse(card.text) as string;
  const html = injectEmbedsIntoHtml(rawHtml, embedCache, embeddedFiles);

  // Used for the per-card "Fetch N embeds" button.
  const uncachedUrls = extractUrls(card.text).filter((u) => !(u in embedCache));

  const accentCategories = [...new Set(tags.map((t) => t.category))];
  const neutralAccentColor = darkMode ? "#374151" : "#e5e7eb";

  return (
    <div
      ref={cardRef}
      tabIndex={0}
      data-card-id={card.id}
      class={[
        "group bg-white dark:bg-gray-800 rounded-xl shadow-sm",
        "flex flex-col min-w-0",
        "transition-all duration-150",
        "focus:outline-none",
        editing
          ? "ring-2 ring-blue-400 ring-offset-1 shadow-md"
          : isDropTarget
            ? "ring-2 ring-blue-500 ring-offset-2 shadow-lg"
            : isFocused
              ? "ring-2 ring-blue-300 dark:ring-blue-600 ring-offset-1 shadow-md"
              : "ring-1 ring-black/[0.07] dark:ring-white/[0.08] hover:shadow-md",
        isDragging ? "opacity-40" : "",
        editing || isDragDisabled ? "cursor-default" : "cursor-grab active:cursor-grabbing select-none",
      ].join(" ")}
      draggable={!dragDisabled}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleCardKeyDown}
      onClick={() => { if (!editing) cardRef.current?.focus(); }}
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
        <div
          class={[
            "flex gap-1 transition-opacity duration-100",
            editing ? "" : (isFocused ? "opacity-60 group-hover:opacity-100" : "opacity-0 group-hover:opacity-100"),
            isDragging ? "!opacity-0" : "",
          ].join(" ")}
        >
          {editing ? (
            /* Save + discard buttons — shown while editing */
            <>
              <button
                class="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors duration-100 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); commit(); }}
                title="Save (Ctrl+Enter)"
                aria-label="Save card"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5">
                  <path fill-rule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clip-rule="evenodd" />
                </svg>
              </button>
              <button
                class="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors duration-100 cursor-pointer"
                onClick={(e) => { e.stopPropagation(); cancel(); }}
                title="Discard (Esc)"
                aria-label="Discard changes"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5">
                  <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
                </svg>
              </button>
            </>
          ) : (
            /* Edit button — shown while not editing */
            <button
              class="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors duration-100 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); startEditing(); }}
              title="Edit card"
              aria-label="Edit card"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5">
                <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.776a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.263-4.264a1.75 1.75 0 0 0 0-2.474Z" />
                <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9a.75.75 0 0 1 1.5 0v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
              </svg>
            </button>
          )}
          {!editing && (
            <button
              class="w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors duration-100 cursor-pointer"
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              title="Delete card"
              aria-label="Delete card"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5">
                <path fill-rule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.712Z" clip-rule="evenodd" />
              </svg>
            </button>
          )}
        </div>
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
            placeholder="Card text (Markdown supported)…"
            rows={1}
            spellcheck={false}
          />
          <p class="px-4 pb-3 text-xs text-gray-400 dark:text-gray-500 select-none pointer-events-none">
            Ctrl+Enter to save · Esc to cancel
          </p>
        </div>
      ) : (
        /* View mode — handleProseClick handles embed button clicks via delegation. */
        <div
          class="card-prose px-4 pt-1 pb-2 flex-1 min-w-0 break-words"
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
        {tags.map(({ category, value, raw }, i) => {
          const { bg, text, border } = tagPalette(category, darkMode);
          const isActiveDelete = deletingTagIndex === i;
          return (
            <span
              key={raw}
              class={[
                "group/tag inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium transition-shadow duration-100",
                isActiveDelete ? "ring-2 ring-red-400 ring-offset-1" : "",
              ].join(" ")}
              style={{ backgroundColor: bg, color: text, borderColor: border }}
            >
              <span class="opacity-50 font-normal">{category}</span>
              {value && <span>{value}</span>}
              {!editing && (
                <button
                  class={[
                    "ml-0.5 transition-opacity duration-100 hover:text-red-500 leading-none cursor-pointer",
                    deletingTagIndex !== null
                      ? "opacity-100"
                      : "opacity-0 group-hover/tag:opacity-100",
                  ].join(" ")}
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

        {/* Keyboard hint shown while in delete-tag mode */}
        {deletingTagIndex !== null && (
          <p class="w-full text-xs text-gray-400 dark:text-gray-500 mt-0.5 select-none">
            ←→ navigate · ↵ or Del to remove · Esc to cancel
          </p>
        )}

        {!editing && deletingTagIndex === null && (
          addingTag ? (
            <TagInput
              allTags={allTags}
              tagCounts={tagCounts}
              existingTags={card.tags}
              onAdd={(tag) => { setAddingTag(false); onAddTag(tag); cardRef.current?.focus(); }}
              onCancel={() => { setAddingTag(false); cardRef.current?.focus(); }}
            />
          ) : (
            <button
              class={[
                "text-xs px-2 py-0.5 rounded-full border border-dashed",
                "border-gray-300 dark:border-gray-600",
                "text-gray-400 dark:text-gray-500",
                "hover:text-blue-500 hover:border-blue-400",
                "transition-colors duration-100 cursor-pointer",
                isFocused || tags.length === 0
                  ? "opacity-60 group-hover:opacity-100"
                  : "opacity-0 group-hover:opacity-100",
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
