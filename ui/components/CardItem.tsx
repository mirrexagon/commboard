import { marked } from "marked";
import { useEffect, useRef, useState } from "preact/hooks";
import { tagPalette } from "../lib/colors.ts";

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
  darkMode: boolean;
  /** True while this card is the one being dragged */
  isDragging: boolean;
  /** True while the cursor is over this card as a drop target */
  isDropTarget: boolean;
  onDelete: () => void;
  onUpdate: (text: string) => void;
  onDragStart: (e: DragEvent) => void;
  onDragEnter: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: (e: DragEvent) => void;
  onDragEnd: (e: DragEvent) => void;
}

export function CardItem({
  card,
  darkMode,
  isDragging,
  isDropTarget,
  onDelete,
  onUpdate,
  onDragStart,
  onDragEnter,
  onDragOver,
  onDrop,
  onDragEnd,
}: Props) {
  const [editing, setEditing] = useState(false);
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

  return (
    <div
      class={[
        "group bg-white dark:bg-gray-800 rounded-xl shadow-sm",
        "flex flex-col min-w-0 relative",
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
      // Disable drag while editing so text selection works normally.
      draggable={!editing}
      onDragStart={editing ? undefined : onDragStart}
      onDragEnter={editing ? undefined : onDragEnter}
      onDragOver={editing ? undefined : onDragOver}
      onDrop={editing ? undefined : onDrop}
      onDragEnd={editing ? undefined : onDragEnd}
    >
      {/* ── Action buttons (top-right), visible on hover, hidden while editing ── */}
      {!editing && (
        <div
          class={[
            "absolute top-2 right-2 z-10 flex gap-1",
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

      {/* ── Drag-handle hint (top-left), hidden while editing ── */}
      {!editing && (
        <div
          class={[
            "absolute top-2 left-2 z-10",
            "text-gray-300 dark:text-gray-600",
            "opacity-0 group-hover:opacity-100",
            isDragging ? "!opacity-0" : "",
            "transition-opacity duration-100 pointer-events-none select-none text-xs leading-none",
          ].join(" ")}
          aria-hidden="true"
        >
          ⠿
        </div>
      )}

      {/* ── Card body ── */}
      {editing ? (
        /* Edit mode */
        <div class="flex flex-col flex-1 min-w-0">
          <textarea
            ref={textareaRef}
            class={[
              "w-full resize-none overflow-hidden",
              "px-4 pt-4 pb-2",
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
          class="card-prose px-4 pt-6 pb-4 flex-1 min-w-0 break-words cursor-text"
          title="Click to edit"
          onClick={startEditing}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      )}

      {/* ── Tags ── */}
      {tags.length > 0 && (
        <div class="px-4 pb-3 pt-1 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-1.5">
          {tags.map(({ category, value, raw }) => {
            const [bg, text, border] = tagPalette(category, darkMode);
            return (
              <span
                key={raw}
                class={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${bg} ${text} ${border}`}
              >
                <span class="opacity-50 font-normal">{category}</span>
                {value && <span>{value}</span>}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
