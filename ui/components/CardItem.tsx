import { marked } from "marked";
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
  onDragStart,
  onDragEnter,
  onDragOver,
  onDrop,
  onDragEnd,
}: Props) {
  // marked.parse() is synchronous when no async extensions are registered.
  const html = marked.parse(card.text) as string;

  const tags = [...card.tags].sort().map(parseTag);

  return (
    <div
      class={[
        "group bg-white dark:bg-gray-800 rounded-xl shadow-sm",
        "flex flex-col min-w-0 relative select-none",
        "transition-all duration-150",
        // Ring: blue when drop target, default otherwise
        isDropTarget
          ? "ring-2 ring-blue-500 ring-offset-2 shadow-lg"
          : "ring-1 ring-black/[0.07] dark:ring-white/[0.08] hover:shadow-md",
        // Dim the card that is being dragged
        isDragging ? "opacity-40" : "",
        // Grab cursor everywhere on the card
        "cursor-grab active:cursor-grabbing",
      ].join(" ")}
      draggable
      onDragStart={onDragStart}
      onDragEnter={onDragEnter}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      {/* Delete button — hidden until the card is hovered */}
      <button
        class={[
          "absolute top-2 right-2 z-10",
          "w-6 h-6 flex items-center justify-center rounded-full",
          "text-gray-400 hover:text-red-500",
          "hover:bg-red-50 dark:hover:bg-red-900/30",
          "transition-colors duration-100",
          "opacity-0 group-hover:opacity-100",
          // While dragging, keep the button hidden so it doesn't interfere
          isDragging ? "!opacity-0" : "",
          "cursor-pointer",
        ].join(" ")}
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Delete card"
        aria-label="Delete card"
      >
        {/* ✕ */}
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 16 16"
          fill="currentColor"
          class="w-3.5 h-3.5"
        >
          <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>

      {/* Drag-handle hint — three dots, top-left, visible on hover */}
      <div
        class={[
          "absolute top-2 left-2 z-10",
          "text-gray-300 dark:text-gray-600",
          "opacity-0 group-hover:opacity-100",
          isDragging ? "!opacity-0" : "",
          "transition-opacity duration-100 pointer-events-none select-none",
          "text-xs leading-none tracking-tighter",
        ].join(" ")}
        aria-hidden="true"
      >
        ⠿
      </div>

      {/* Card body — leave a bit of top-padding so it doesn't overlap the drag handle */}
      <div
        class="card-prose px-4 pt-6 pb-4 flex-1 min-w-0 break-words"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Tags — only rendered when present */}
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
