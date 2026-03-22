import { marked } from "marked";
import { useEffect, useRef, useState } from "preact/hooks";
import { tagAccentBg, tagPalette } from "../lib/colors.ts";

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

  // Show suggestions only when the user has typed something.
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
              // onMouseDown with preventDefault keeps the input focused so onBlur
              // doesn't fire before the suggestion click is processed.
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
  /** All unique tags in the board, for autocomplete when adding a new tag. */
  allTags: string[];
  darkMode: boolean;
  /** True while this card is the one being dragged */
  isDragging: boolean;
  /** True while the cursor is over this card as a drop target */
  isDropTarget: boolean;
  onDelete: () => void;
  onUpdate: (text: string) => void;
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
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
  onDelete,
  onUpdate,
  onAddTag,
  onRemoveTag,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDrop,
  onDragEnd,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [addingTag, setAddingTag] = useState(false);
  const [draft, setDraft] = useState(card.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Keep draft in sync with external card.text changes (e.g. after a save
  // round-trips through the server) but only when we're not editing.
  useEffect(() => {
    if (!editing) setDraft(card.text);
  }, [card.text, editing]);

  // When entering edit mode: focus the textarea and auto-size it.
  useEffect(() => {
    if (editing && textareaRef.current) {
      const el = textareaRef.current;
      autoResize(el);
      el.focus();
      // Place cursor at the end of the text.
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
      // Don't allow saving an empty card — revert silently.
      cancel();
      return;
    }
    setEditing(false);
    if (trimmed !== card.text) {
      onUpdate(trimmed);
    }
  }

  function cancel() {
    setDraft(card.text);
    setEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      commit();
    }
  }

  function handleInput(e: Event) {
    const el = e.target as HTMLTextAreaElement;
    setDraft(el.value);
    autoResize(el);
  }

  // marked.parse() is synchronous when no async extensions are registered.
  const html = marked.parse(card.text) as string;
  const tags = [...card.tags].sort().map(parseTag);

  // Accent bar: color driven by the first tag's category, or neutral if no tags.
  const firstCategory = tags.length > 0 ? tags[0].category : null;
  const accentBg = firstCategory
    ? tagAccentBg(firstCategory, darkMode)
    : darkMode
      ? "bg-gray-700"
      : "bg-gray-200";

  return (
    <div
      class={[
        "group bg-white dark:bg-gray-800 rounded-xl shadow-sm",
        "flex flex-col min-w-0",
        "transition-all duration-150",
        // Ring: blue when drop target or editing, default otherwise
        editing
          ? "ring-2 ring-blue-400 ring-offset-1 shadow-md"
          : isDropTarget
            ? "ring-2 ring-blue-500 ring-offset-2 shadow-lg"
            : "ring-1 ring-black/[0.07] dark:ring-white/[0.08] hover:shadow-md",
        // Dim while being dragged
        isDragging ? "opacity-40" : "",
        // Only show grab cursor in view mode
        editing ? "cursor-default" : "cursor-grab active:cursor-grabbing select-none",
      ].join(" ")}
      // Disable drag while editing or adding a tag so interaction works normally.
      draggable={!editing && !addingTag}
      onDragStart={editing || addingTag ? undefined : onDragStart}
      onDragEnter={editing || addingTag ? undefined : onDragEnter}
      onDragOver={editing || addingTag ? undefined : onDragOver}
      onDrop={editing || addingTag ? undefined : onDrop}
      onDragEnd={editing || addingTag ? undefined : onDragEnd}
    >
      {/* ── Accent bar ── */}
      <div class={`h-1.5 rounded-t-xl ${accentBg} transition-colors duration-200`} />

      {/* ── Card header row: drag handle | #ID | spacer | edit + delete ── */}
      <div class="flex items-center px-2 pt-1 pb-0.5 min-w-0">
        {/* Drag-handle hint — same size as icon buttons, fades in on hover */}
        {!editing ? (
          <div
            class={[
              "w-6 h-6 flex items-center justify-center shrink-0",
              "text-gray-300 dark:text-gray-600",
              "opacity-0 group-hover:opacity-100",
              isDragging ? "!opacity-0" : "",
              "transition-opacity duration-100 pointer-events-none select-none",
            ].join(" ")}
            aria-hidden="true"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3.5 h-3.5">
              <path d="M5.5 3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM5.5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM5.5 12.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM12.5 3.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM12.5 8a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM12.5 12.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" />
            </svg>
          </div>
        ) : (
          /* Keep the same space so the #ID stays in the same position */
          <div class="w-6 h-6 shrink-0" />
        )}

        {/* Card ID */}
        <span class="ml-0.5 text-xs text-gray-400 dark:text-gray-500 font-mono select-none leading-none">
          #{card.id}
        </span>

        {/* Spacer */}
        <div class="flex-1" />

        {/* Edit + Delete — visible on hover, hidden while editing */}
        {!editing && (
          <div
            class={[
              "flex gap-1",
              "opacity-0 group-hover:opacity-100 transition-opacity duration-100",
              isDragging ? "!opacity-0" : "",
            ].join(" ")}
          >
            {/* Edit (pencil) button */}
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

            {/* Delete (×) button */}
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
        /* Edit mode */
        <div class="flex flex-col flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            class={[
              "w-full resize-none overflow-hidden",
              "px-4 pt-2 pb-2",
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
        /* View mode — clicking enters edit mode */
        <div
          class="card-prose px-4 pt-1 pb-2 flex-1 min-w-0 break-words cursor-text"
          title="Click to edit"
          onClick={startEditing}
          dangerouslySetInnerHTML={{ __html: html }}
        />
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
          const [bg, text, border] = tagPalette(category, darkMode);
          return (
            <span
              key={raw}
              class={`group/tag inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${bg} ${text} ${border}`}
            >
              <span class="opacity-50 font-normal">{category}</span>
              {value && <span>{value}</span>}
              {/* Remove tag × — visible on hover of the tag pill */}
              {!editing && (
                <button
                  class="ml-0.5 opacity-0 group-hover/tag:opacity-100 transition-opacity duration-100 hover:text-red-500 leading-none cursor-pointer"
                  title={`Remove tag "${raw}"`}
                  aria-label={`Remove tag ${raw}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveTag(raw);
                  }}
                >
                  ×
                </button>
              )}
            </span>
          );
        })}

        {/* Add-tag input or + button — hidden while editing body text */}
        {!editing && (
          addingTag ? (
            <TagInput
              allTags={allTags}
              existingTags={card.tags}
              onAdd={(tag) => {
                setAddingTag(false);
                onAddTag(tag);
              }}
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
                // Only show on hover unless the card already has no tags (always visible then)
                tags.length > 0
                  ? "opacity-0 group-hover:opacity-100"
                  : "opacity-60 group-hover:opacity-100",
              ].join(" ")}
              title="Add tag"
              aria-label="Add tag"
              onClick={(e) => {
                e.stopPropagation();
                setAddingTag(true);
              }}
            >
              + tag
            </button>
          )
        )}
      </div>
    </div>
  );
}
