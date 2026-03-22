import { render } from "preact";
import { useEffect, useRef, useState } from "preact/hooks";

import { Header } from "./components/Header.tsx";
import { CardItem, type Card } from "./components/CardItem.tsx";
import { FileBrowser } from "./components/FileBrowser.tsx";
import type { Board, EmbedData, EmbeddedFile } from "../board.ts";
import { tagPalette } from "./lib/colors.ts";
import { insertLinkInTextarea, mimeToExt, readFileAsBase64 } from "./lib/files.ts";

// ---- Filter helper ----

function matchesFilter(card: Card, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  return (
    card.text.toLowerCase().includes(q) ||
    card.tags.some((t) => t.toLowerCase().includes(q))
  );
}

// ---- Data fetching ----

async function fetchBoard(): Promise<Board> {
  const res = await fetch("/api/board");
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ---- Helpers ----

/**
 * Re-place cards that belong to a category column back into the global order,
 * preserving the positions of all other cards.
 *
 * Example:
 *   globalOrder    = [1, 3, 5, 2, 4]
 *   currentColIds  = [1, 5, 4]   (column cards in their current global order)
 *   newColIds      = [5, 1, 4]   (user's new order for those cards)
 *   → positions occupied by column cards in globalOrder: 0, 2, 4
 *   → newGlobal[0]=5, newGlobal[2]=1, newGlobal[4]=4
 *   → result        = [5, 3, 1, 2, 4]
 */
function reorderInCategory(
  globalOrder: number[],
  currentColIds: number[],
  newColIds: number[],
): number[] {
  const positions = currentColIds
    .map((id) => globalOrder.indexOf(id))
    .sort((a, b) => a - b);

  const result = [...globalOrder];
  positions.forEach((pos, i) => {
    result[pos] = newColIds[i];
  });
  return result;
}

// ---- Empty state ----

function EmptyState() {
  return (
    <div class="flex flex-col items-center justify-center h-64 text-center select-none">
      <div class="text-5xl mb-4">📋</div>
      <p class="text-gray-500 dark:text-gray-400 font-medium">No cards yet</p>
      <p class="text-gray-400 dark:text-gray-500 text-sm mt-1">
        Click <strong class="font-semibold">Add card</strong> to get started.
      </p>
    </div>
  );
}

function NoSearchResults() {
  return (
    <div class="flex flex-col items-center justify-center h-64 text-center select-none">
      <div class="text-5xl mb-4">🔍</div>
      <p class="text-gray-500 dark:text-gray-400 font-medium">No cards match your search</p>
      <p class="text-gray-400 dark:text-gray-500 text-sm mt-1">
        Try a different search term or clear the filter.
      </p>
    </div>
  );
}

// ---- MoveToPositionDialog ----

interface MoveToPositionDialogProps {
  /** 1-based current position of the card being moved. */
  currentPosition: number;
  totalCards: number;
  onConfirm: (newPosition: number) => void;
  onCancel: () => void;
}

function MoveToPositionDialog({
  currentPosition,
  totalCards,
  onConfirm,
  onCancel,
}: MoveToPositionDialogProps) {
  const [value, setValue] = useState(String(currentPosition));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
    inputRef.current?.focus();
  }, []);

  const n = parseInt(value, 10);
  const isValid = !isNaN(n) && n >= 1 && n <= totalCards;

  function handleConfirm() {
    if (isValid) onConfirm(n);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); handleConfirm(); }
    if (e.key === "Escape") { e.preventDefault(); onCancel(); }
  }

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onCancel}
    >
      <div
        class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-72 flex flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 class="text-sm font-semibold text-gray-800 dark:text-gray-200">
          Move card to position
        </h2>
        <p class="text-xs text-gray-500 dark:text-gray-400">
          Enter a position from 1 to {totalCards}. Current position: {currentPosition}.
        </p>
        <input
          ref={inputRef}
          type="number"
          min={1}
          max={totalCards}
          value={value}
          onInput={(e) => setValue((e.target as HTMLInputElement).value)}
          onKeyDown={handleKeyDown}
          class={[
            "w-full px-3 py-2 rounded-lg border text-sm",
            "bg-white dark:bg-gray-700",
            "text-gray-800 dark:text-gray-200",
            isValid
              ? "border-gray-300 dark:border-gray-600 focus:border-blue-400 outline-none"
              : "border-red-400 outline-none",
          ].join(" ")}
        />
        <div class="flex gap-2 justify-end">
          <button
            class="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            class={[
              "px-3 py-1.5 text-xs rounded-lg font-medium transition-colors",
              isValid
                ? "bg-blue-500 hover:bg-blue-600 text-white cursor-pointer"
                : "bg-blue-200 dark:bg-blue-900/30 text-blue-300 dark:text-blue-700 cursor-not-allowed",
            ].join(" ")}
            disabled={!isValid}
            onClick={handleConfirm}
          >
            Move
          </button>
        </div>
      </div>
    </div>
  );
}

// ---- CardGrid with drag-and-drop (default / all-cards view) ----

interface CardGridProps {
  cards: Card[];
  allTags: string[];
  tagCounts: Record<string, number>;
  darkMode: boolean;
  /** When set, cards are filtered to those matching this query and drag-and-drop is disabled. */
  filterQuery: string;
  embedCache: Record<string, EmbedData>;
  embeddedFiles: Record<string, EmbeddedFile>;
  onDelete: (id: number) => void;
  onUpdate: (id: number, text: string) => void;
  onReorder: (newOrder: number[]) => void;
  onAddTag: (id: number, tag: string) => void;
  onRemoveTag: (id: number, tag: string) => void;
  onFetchEmbed: (url: string, refetch: boolean) => void;
}

function CardGrid({ cards, allTags, tagCounts, darkMode, filterQuery, embedCache, embeddedFiles, onDelete, onUpdate, onReorder, onAddTag, onRemoveTag, onFetchEmbed }: CardGridProps) {
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [dropAtEnd, setDropAtEnd] = useState(false);
  const [dropAtPosition, setDropAtPosition] = useState(false);
  /** When non-null, the "move to position" dialog is shown for this card id. */
  const [moveToPositionCardId, setMoveToPositionCardId] = useState<number | null>(null);

  const isFiltering = filterQuery.trim().length > 0;
  const displayCards = isFiltering
    ? cards.filter((c) => matchesFilter(c, filterQuery))
    : cards;

  if (displayCards.length === 0) {
    if (isFiltering) return <NoSearchResults />;
    return <EmptyState />;
  }

  function handleDragStart(e: DragEvent, id: number) {
    setDraggedId(id);
    setDropTargetId(null);
    setDropAtEnd(false);
    if (e.dataTransfer) {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", String(id));
    }
  }

  function handleDragEnter(e: DragEvent, id: number) {
    e.preventDefault();
    setDropTargetId(id !== draggedId ? id : null);
    setDropAtEnd(false);
  }

  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: DragEvent, targetId: number) {
    e.preventDefault();
    if (draggedId === null || draggedId === targetId) { reset(); return; }

    const filteredIds = displayCards.map((c) => c.id);
    const withoutDragged = filteredIds.filter((id) => id !== draggedId);
    const insertIndex = withoutDragged.indexOf(targetId);
    if (insertIndex === -1) { reset(); return; }

    withoutDragged.splice(insertIndex, 0, draggedId);
    // When filtering, splice back into the full global order at the same slots the
    // filtered cards occupy, leaving all non-matching cards exactly where they are.
    onReorder(
      isFiltering
        ? reorderInCategory(cards.map((c) => c.id), filteredIds, withoutDragged)
        : withoutDragged,
    );
    reset();
  }

  function handleDragEnd() { reset(); }

  function handleEndZoneDragEnter(e: DragEvent) {
    e.preventDefault();
    if (draggedId !== null) { setDropAtEnd(true); setDropAtPosition(false); setDropTargetId(null); }
  }

  function handleEndZoneDragLeave() { setDropAtEnd(false); }

  function handleEndZoneDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  }

  function handleEndZoneDrop(e: DragEvent) {
    e.preventDefault();
    if (draggedId === null) { reset(); return; }
    const filteredIds = displayCards.map((c) => c.id);
    const newFilteredIds = filteredIds.filter((id) => id !== draggedId);
    newFilteredIds.push(draggedId);
    onReorder(
      isFiltering
        ? reorderInCategory(cards.map((c) => c.id), filteredIds, newFilteredIds)
        : newFilteredIds,
    );
    reset();
  }

  function handlePositionZoneDragEnter(e: DragEvent) {
    e.preventDefault();
    if (draggedId !== null) { setDropAtPosition(true); setDropAtEnd(false); setDropTargetId(null); }
  }

  function handlePositionZoneDragLeave() { setDropAtPosition(false); }

  function handlePositionZoneDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  }

  function handlePositionZoneDrop(e: DragEvent) {
    e.preventDefault();
    if (draggedId === null) { reset(); return; }
    // Save the id before reset clears it, then open the dialog.
    const id = draggedId;
    reset();
    setMoveToPositionCardId(id);
  }

  function handleMoveToPositionConfirm(newPosition: number) {
    if (moveToPositionCardId === null) return;
    const id = moveToPositionCardId;
    setMoveToPositionCardId(null);
    // Build the new order: remove card from current position, insert at newPosition (1-based).
    const ids = cards.map((c) => c.id).filter((cid) => cid !== id);
    ids.splice(newPosition - 1, 0, id);
    onReorder(ids);
  }

  function reset() { setDraggedId(null); setDropTargetId(null); setDropAtEnd(false); setDropAtPosition(false); }

  // Height of the fixed drop-zone bar (also used as bottom padding while dragging).
  const DROP_BAR_HEIGHT = "5rem"; // h-20

  return (
    <div
      class="flex flex-col gap-4"
      // Push content up so the last row of cards isn't hidden behind the fixed bar.
      style={draggedId !== null ? { paddingBottom: DROP_BAR_HEIGHT } : undefined}
    >
      <div
        class="grid gap-4 items-start"
        style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))"
      >
        {displayCards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            allTags={allTags}
            tagCounts={tagCounts}
            darkMode={darkMode}
            isDragging={draggedId === card.id}
            isDropTarget={dropTargetId === card.id}
            embedCache={embedCache}
            embeddedFiles={embeddedFiles}
            onDelete={() => onDelete(card.id)}
            onUpdate={(text) => onUpdate(card.id, text)}
            onAddTag={(tag) => onAddTag(card.id, tag)}
            onRemoveTag={(tag) => onRemoveTag(card.id, tag)}
            onFetchEmbed={onFetchEmbed}
            onDragStart={(e) => handleDragStart(e, card.id)}
            onDragEnter={(e) => handleDragEnter(e, card.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, card.id)}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      {/* Fixed drop-zone bar — always visible at the bottom of the viewport during a drag. */}
      {draggedId !== null && (
        <div class="fixed bottom-0 left-0 right-0 z-40 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 px-6 py-3">
          <div class="max-w-screen-2xl mx-auto flex gap-4">
            <div
              class={[
                "flex-1 h-12 rounded-xl border-2 border-dashed transition-colors duration-150 flex items-center justify-center",
                dropAtEnd
                  ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400"
                  : "border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500",
              ].join(" ")}
              onDragEnter={handleEndZoneDragEnter}
              onDragLeave={handleEndZoneDragLeave}
              onDragOver={handleEndZoneDragOver}
              onDrop={handleEndZoneDrop}
            >
              <span class="text-xs font-medium select-none pointer-events-none">
                Drop here to move to end
              </span>
            </div>

            <div
              class={[
                "flex-1 h-12 rounded-xl border-2 border-dashed transition-colors duration-150 flex items-center justify-center",
                dropAtPosition
                  ? "border-purple-400 bg-purple-50 dark:bg-purple-900/20 text-purple-500 dark:text-purple-400"
                  : "border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500",
              ].join(" ")}
              onDragEnter={handlePositionZoneDragEnter}
              onDragLeave={handlePositionZoneDragLeave}
              onDragOver={handlePositionZoneDragOver}
              onDrop={handlePositionZoneDrop}
            >
              <span class="text-xs font-medium select-none pointer-events-none">
                Drop here to move to position…
              </span>
            </div>
          </div>
        </div>
      )}

      {moveToPositionCardId !== null && (() => {
        const currentPos = cards.findIndex((c) => c.id === moveToPositionCardId) + 1;
        return (
          <MoveToPositionDialog
            currentPosition={currentPos > 0 ? currentPos : 1}
            totalCards={cards.length}
            onConfirm={handleMoveToPositionConfirm}
            onCancel={() => setMoveToPositionCardId(null)}
          />
        );
      })()}
    </div>
  );
}

// ---- CategoryColumn — a single column in category view ----
//
// All drag state lives in CategoryView. CategoryColumn is a thin presenter
// that fires events upward and renders based on the drag state it receives.

interface CategoryColumnProps {
  category: string;
  value: string;
  /** Cards belonging to this column, in global order. */
  cards: Card[];
  allTags: string[];
  tagCounts: Record<string, number>;
  darkMode: boolean;
  /** When true, drag-and-drop is disabled (filter is active). */
  isDragDisabled: boolean;

  // ── Drag state provided by CategoryView ──
  /** ID of the card currently being dragged (dimmed wherever it appears). */
  activeDragId: number | null;
  /** Card in this column highlighted as the drop target. */
  dropTargetCardId: number | null;
  /** True when the end-zone of this column is highlighted. */
  dropAtEnd: boolean;
  /** True when a card from a different column is being dragged over this one. */
  isCrossColumnTarget: boolean;
  /** True when a cross-column drop would be illegal (card already has dest tag). */
  isDropDisabled: boolean;
  /** True when any drag is active (reveals end zones). */
  anyDragActive: boolean;

  // ── Drag event callbacks to CategoryView ──
  onDragStart: (cardId: number, e: DragEvent) => void;
  onDragEnterCard: (cardId: number) => void;
  onDragEnterEndZone: () => void;
  onDragLeaveEndZone: () => void;
  onDragOver: (e: DragEvent) => void;
  onDropOnCard: (targetCardId: number) => void;
  onDropOnEndZone: () => void;
  onDragEnd: () => void;

  // ── Card operations ──
  onDelete: (id: number) => void;
  onUpdate: (id: number, text: string) => void;
  onAddTag: (id: number, tag: string) => void;
  onRemoveTag: (id: number, tag: string) => void;
  embedCache: Record<string, EmbedData>;
  embeddedFiles: Record<string, EmbeddedFile>;
  onFetchEmbed: (url: string, refetch: boolean) => void;
}

function CategoryColumn({
  category,
  value,
  cards,
  allTags,
  tagCounts,
  darkMode,
  isDragDisabled,
  activeDragId,
  dropTargetCardId,
  dropAtEnd,
  isCrossColumnTarget,
  isDropDisabled,
  anyDragActive,
  onDragStart,
  onDragEnterCard,
  onDragEnterEndZone,
  onDragLeaveEndZone,
  onDragOver,
  onDropOnCard,
  onDropOnEndZone,
  onDragEnd,
  onDelete,
  onUpdate,
  onAddTag,
  onRemoveTag,
  embedCache,
  embeddedFiles,
  onFetchEmbed,
}: CategoryColumnProps) {
  const { bg: headerBg, text: headerText, border: headerBorder } = tagPalette(category, darkMode);

  // End-zone / empty-column styling
  const endZoneActive = dropAtEnd || (isCrossColumnTarget && !isDropDisabled && cards.length === 0);
  const endZoneClass = [
    "rounded-xl border-2 border-dashed transition-colors duration-150 flex items-center justify-center",
    endZoneActive
      ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-blue-500 dark:text-blue-400"
      : isCrossColumnTarget && isDropDisabled
        ? "border-red-300 dark:border-red-700 text-red-400 dark:text-red-500"
        : "border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500",
  ].join(" ");

  return (
    <div class="flex flex-col gap-3 w-72 flex-shrink-0">
      {/* Column header */}
      <div
        class="flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold text-sm select-none"
        style={{ backgroundColor: headerBg, color: headerText, borderColor: headerBorder }}
      >
        <span class="opacity-60 font-normal text-xs">{category}</span>
        <span>{value}</span>
        <span class="ml-auto opacity-60 font-normal text-xs">{cards.length}</span>
      </div>

      {/* Cards or empty-column drop target */}
      {cards.length === 0 ? (
        !isDragDisabled && (
          <div
            class={`${endZoneClass} h-20`}
            onDragEnter={(e) => { e.preventDefault(); onDragEnterEndZone(); }}
            onDragLeave={onDragLeaveEndZone}
            onDragOver={onDragOver}
            onDrop={(e) => { e.preventDefault(); onDropOnEndZone(); }}
          >
            <span class="text-xs font-medium select-none pointer-events-none">
              {isCrossColumnTarget && isDropDisabled ? "Already in column" : "Drop here"}
            </span>
          </div>
        )
      ) : (
        <div class="flex flex-col gap-3">
          {cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              allTags={allTags}
              tagCounts={tagCounts}
              darkMode={darkMode}
              isDragging={activeDragId === card.id}
              isDropTarget={dropTargetCardId === card.id}
              isDragDisabled={isDragDisabled}
              embedCache={embedCache}
              embeddedFiles={embeddedFiles}
              onDelete={() => onDelete(card.id)}
              onUpdate={(text) => onUpdate(card.id, text)}
              onAddTag={(tag) => onAddTag(card.id, tag)}
              onRemoveTag={(tag) => onRemoveTag(card.id, tag)}
              onFetchEmbed={onFetchEmbed}
              onDragStart={(e) => onDragStart(card.id, e)}
              onDragEnter={(e) => { e.preventDefault(); onDragEnterCard(card.id); }}
              onDragOver={onDragOver}
              onDrop={(e) => { e.preventDefault(); onDropOnCard(card.id); }}
              onDragEnd={onDragEnd}
            />
          ))}
        </div>
      )}

      {/* End-zone (shown at the bottom whenever any drag is active) */}
      {anyDragActive && !isDragDisabled && cards.length > 0 && (
        <div
          class={`${endZoneClass} h-12`}
          onDragEnter={(e) => { e.preventDefault(); onDragEnterEndZone(); }}
          onDragLeave={onDragLeaveEndZone}
          onDragOver={onDragOver}
          onDrop={(e) => { e.preventDefault(); onDropOnEndZone(); }}
        >
          <span class="text-xs font-medium select-none pointer-events-none">
            {isCrossColumnTarget && isDropDisabled ? "Already in column" : "Move to end"}
          </span>
        </div>
      )}
    </div>
  );
}

// ---- CategoryView — all columns for the active category ----

/** Drag state owned by CategoryView (lifted above individual columns). */
interface CategoryDragState {
  draggedId: number;
  /** Column value the drag originated from. */
  sourceValue: string;
  /** Column value currently being dragged over (null when not over any column target). */
  targetValue: string | null;
  /** Card in the target column currently being hovered (null = hovering end-zone). */
  targetCardId: number | null;
  /** True when hovering the end-zone of targetValue column. */
  atEnd: boolean;
}

interface CategoryViewProps {
  board: Board;
  category: string;
  allTags: string[];
  tagCounts: Record<string, number>;
  darkMode: boolean;
  /** When set, cards in each column are filtered and drag-and-drop is disabled. */
  filterQuery: string;
  onDelete: (id: number) => void;
  onUpdate: (id: number, text: string) => void;
  onReorder: (newOrder: number[]) => void;
  /** Called when a card is dragged to a different column. */
  onMoveToColumn: (
    cardId: number,
    sourceTag: string,
    destTag: string,
    newGlobalOrder: number[],
  ) => void;
  onAddTag: (id: number, tag: string) => void;
  onRemoveTag: (id: number, tag: string) => void;
  embedCache: Record<string, EmbedData>;
  embeddedFiles: Record<string, EmbeddedFile>;
  onFetchEmbed: (url: string, refetch: boolean) => void;
}

function CategoryView({
  board,
  category,
  allTags,
  tagCounts,
  darkMode,
  filterQuery,
  embedCache,
  embeddedFiles,
  onDelete,
  onUpdate,
  onReorder,
  onMoveToColumn,
  onAddTag,
  onRemoveTag,
  onFetchEmbed,
}: CategoryViewProps) {
  const [dragState, setDragState] = useState<CategoryDragState | null>(null);

  // All cards in global order.
  const allCards = board.card_order
    .map((id) => board.cards[String(id)])
    .filter(Boolean);

  // Collect all values for this category, sorted alphabetically.
  const prefix = category + ":";
  const valueSet = new Set<string>();
  for (const card of allCards) {
    for (const tag of card.tags) {
      if (tag.startsWith(prefix)) valueSet.add(tag.slice(prefix.length));
    }
  }
  const values = [...valueSet].sort();

  if (values.length === 0) {
    return (
      <div class="flex flex-col items-center justify-center h-64 text-center select-none">
        <div class="text-5xl mb-4">🗂️</div>
        <p class="text-gray-500 dark:text-gray-400 font-medium">
          No cards have the category "{category}"
        </p>
        <p class="text-gray-400 dark:text-gray-500 text-sm mt-1">
          Add tags like <strong class="font-semibold">{category}:value</strong> to cards to see them here.
        </p>
      </div>
    );
  }

  // ── Drag handlers (shared logic, bound per column via closures) ──

  function handleDrop(destValue: string, targetCardId: number | null, atEnd: boolean) {
    if (!dragState) return;
    const { draggedId, sourceValue } = dragState;
    setDragState(null);

    if (sourceValue === destValue) {
      // ── Within-column reorder (use reorderInCategory to minimise disruption) ──

      // No real target means the card was dropped without hovering over a different
      // card or end-zone (e.g. dropped back on itself). Nothing to do.
      if (targetCardId === null && !atEnd) return;

      const tag = `${category}:${sourceValue}`;
      const colIds = allCards.filter((c) => c.tags.includes(tag)).map((c) => c.id);

      const withoutDragged = colIds.filter((id) => id !== draggedId);
      if (atEnd) {
        withoutDragged.push(draggedId);
      } else {
        // targetCardId is guaranteed non-null here (checked above)
        const i = withoutDragged.indexOf(targetCardId!);
        if (i === -1) return; // target not found (shouldn't happen) — no-op
        withoutDragged.splice(i, 0, draggedId);
      }
      onReorder(reorderInCategory(board.card_order, colIds, withoutDragged));
    } else {
      // ── Cross-column move (tag swap + global reorder) ──
      const card = board.cards[String(draggedId)];
      const destTag = `${category}:${destValue}`;
      if (card.tags.includes(destTag)) return; // blocked: card already in dest column

      const sourceTag = `${category}:${sourceValue}`;

      // Place the dragged card before the hovered target card in global order,
      // or at the very end if dropped on an end-zone or empty column.
      const withoutDragged = board.card_order.filter((id) => id !== draggedId);
      let newGlobal: number[];
      if (atEnd || targetCardId === null) {
        newGlobal = [...withoutDragged, draggedId];
      } else {
        const i = withoutDragged.indexOf(targetCardId);
        const copy = [...withoutDragged];
        copy.splice(i === -1 ? copy.length : i, 0, draggedId);
        newGlobal = copy;
      }
      onMoveToColumn(draggedId, sourceTag, destTag, newGlobal);
    }
  }

  const isFiltering = filterQuery.trim().length > 0;

  // When filtering, check if any cards match at all in this category view.
  if (isFiltering) {
    const anyMatch = allCards.some(
      (c) => c.tags.some((t) => t.startsWith(category + ":")) && matchesFilter(c, filterQuery),
    );
    if (!anyMatch) return <NoSearchResults />;
  }

  return (
    <div class="flex gap-4 overflow-x-auto items-start min-h-64 px-1 py-1 pb-4">
      {values.map((v) => {
        const tag = `${category}:${v}`;
        const columnCards = allCards.filter((c) => c.tags.includes(tag));
        // When a filter is active, only show matching cards; skip the whole column if none match.
        const displayColumnCards = isFiltering
          ? columnCards.filter((c) => matchesFilter(c, filterQuery))
          : columnCards;
        if (isFiltering && displayColumnCards.length === 0) return null;

        // ── Per-column drag state ──
        const ds = dragState;
        const isThisTarget = ds?.targetValue === v;
        const isCrossColumn = isThisTarget && ds !== null && ds.sourceValue !== v;
        const draggedCard = ds ? board.cards[String(ds.draggedId)] : null;
        const isDropDisabled =
          isCrossColumn && draggedCard !== null && draggedCard.tags.includes(tag);

        return (
          <CategoryColumn
            key={v}
            category={category}
            value={v}
            cards={displayColumnCards}
            allTags={allTags}
            tagCounts={tagCounts}
            darkMode={darkMode}
            isDragDisabled={isFiltering}
            activeDragId={ds?.draggedId ?? null}
            dropTargetCardId={isThisTarget && !isDropDisabled ? (ds?.targetCardId ?? null) : null}
            dropAtEnd={isThisTarget && !isDropDisabled ? (ds?.atEnd ?? false) : false}
            isCrossColumnTarget={isCrossColumn}
            isDropDisabled={isDropDisabled}
            anyDragActive={ds !== null}
            // ── callbacks ──
            onDragStart={(cardId, e) => {
              if (e.dataTransfer) {
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(cardId));
              }
              setDragState({ draggedId: cardId, sourceValue: v, targetValue: v, targetCardId: null, atEnd: false });
            }}
            onDragEnterCard={(cardId) => {
              setDragState((prev) => {
                if (!prev) return prev;
                // Re-entering the dragged card clears the drop target so no
                // other card stays highlighted.
                if (cardId === prev.draggedId) {
                  return { ...prev, targetValue: v, targetCardId: null, atEnd: false };
                }
                return { ...prev, targetValue: v, targetCardId: cardId, atEnd: false };
              });
            }}
            onDragEnterEndZone={() => {
              setDragState((prev) =>
                prev ? { ...prev, targetValue: v, targetCardId: null, atEnd: true } : prev,
              );
            }}
            onDragLeaveEndZone={() => {
              // Only clear atEnd if the end-zone being left belongs to the current target column.
              setDragState((prev) =>
                prev && prev.targetValue === v && prev.atEnd
                  ? { ...prev, atEnd: false, targetCardId: null }
                  : prev,
              );
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!e.dataTransfer || !ds) return;
              if (ds.sourceValue !== v) {
                // Cross-column: show appropriate cursor
                const destTag = `${category}:${v}`;
                const dragged = board.cards[String(ds.draggedId)];
                e.dataTransfer.dropEffect = dragged?.tags.includes(destTag) ? "none" : "move";
              } else {
                e.dataTransfer.dropEffect = "move";
              }
            }}
            onDropOnCard={(targetCardId) => handleDrop(v, targetCardId, false)}
            onDropOnEndZone={() => handleDrop(v, null, true)}
            onDragEnd={() => setDragState(null)}
            onDelete={onDelete}
            onUpdate={onUpdate}
            onAddTag={onAddTag}
            onRemoveTag={onRemoveTag}
            embedCache={embedCache}
            embeddedFiles={embeddedFiles}
            onFetchEmbed={onFetchEmbed}
          />
        );
      })}
    </div>
  );
}

// ---- Root ----

interface EmbedQueueStatus {
  pending: number;
  processing: string | null;
}

function App() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileBrowserOpen, setFileBrowserOpen] = useState(false);
  /** Path of the most recently paste-uploaded file; passed to FileBrowser to scroll/highlight it. */
  const [highlightPath, setHighlightPath] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(
    () => localStorage.getItem("darkMode") === "true",
  );
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>("");

  // ── Embed queue state ──
  const [embedQueueStatus, setEmbedQueueStatus] = useState<EmbedQueueStatus>({
    pending: 0,
    processing: null,
  });
  /**
   * Set to true to stop the polling loop on the next iteration.
   * Using a ref (not state) so the loop closure always reads the latest value
   * without needing to be recreated.
   */
  const embedPollCancelRef = useRef<boolean>(false);
  /** True while the async polling loop is running. Guards against double-starts. */
  const embedPollActiveRef = useRef<boolean>(false);

  function startEmbedPolling() {
    if (embedPollActiveRef.current) return; // already running
    embedPollCancelRef.current = false;
    embedPollActiveRef.current = true;

    // Sequential async loop: each iteration awaits the previous one fully before
    // the next 2-second sleep begins.  This prevents parallel /api/board requests
    // that would pile up when using setInterval + fire-and-forget fetchBoard().
    void (async () => {
      // Treat as "infinity" so the very first tick always triggers a board fetch
      // if the queue has already made progress before this loop started.
      let lastTotal = Infinity;

      while (!embedPollCancelRef.current) {
        await new Promise<void>((r) => setTimeout(r, 2_000));
        if (embedPollCancelRef.current) break;

        try {
          const qRes = await fetch("/api/embeds/queue");
          if (!qRes.ok || embedPollCancelRef.current) break;
          const q = (await qRes.json()) as EmbedQueueStatus;
          if (embedPollCancelRef.current) break;
          setEmbedQueueStatus(q);

          const total = q.pending + (q.processing !== null ? 1 : 0);

          // Only fetch the board when work has actually completed since the last
          // tick (total decreased).  This avoids hammering /api/board every 2 s
          // on large boards where nothing changed yet.
          if (total < lastTotal) {
            try { setBoard(await fetchBoard()); } catch (e) { console.error(e); }
          }
          lastTotal = total;

          if (total === 0) break; // queue drained; board already refreshed above
        } catch (err) {
          console.error("Embed queue poll failed:", err);
        }
      }

      embedPollActiveRef.current = false;
    })();
  }

  function stopEmbedPolling() {
    embedPollCancelRef.current = true;
    // embedPollActiveRef resets itself when the loop exits naturally.
  }

  // Cancel the polling loop when the component unmounts.
  useEffect(() => () => stopEmbedPolling(), []);

  // ── Global clipboard-paste handler ──
  //
  // Uses a stable ref so the document listener is registered only once while
  // the closure always sees the latest `uploadFile`, `setFileBrowserOpen`, etc.

  const pasteHandlerRef = useRef<(e: ClipboardEvent) => void>(() => {});

  // Update the ref on every render (no deps needed — intentionally runs every render).
  useEffect(() => {
    pasteHandlerRef.current = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      // Find the first clipboard item that is a File (image or otherwise).
      const fileItem = Array.from(items).find((item) => item.kind === "file");
      if (!fileItem) return;

      const file = fileItem.getAsFile();
      if (!file) return;

      // Prevent default so any accompanying text in the clipboard isn't pasted.
      e.preventDefault();

      // Capture the focused textarea NOW, before any async gap.  By the time
      // the upload resolves the user may have clicked elsewhere.
      const targetTextarea =
        document.activeElement instanceof HTMLTextAreaElement
          ? document.activeElement
          : null;

      const mimeType = fileItem.type || file.type || "application/octet-stream";
      const ext = mimeToExt(mimeType);
      const d = new Date();
      const date = d.toISOString().slice(0, 10); // "2026-03-22"
      const time = d.toISOString().slice(11, 19).replace(/:/g, ""); // "123456"
      const filename = `paste-${date}-${time}.${ext}`;

      try {
        const base64 = await readFileAsBase64(file);
        await uploadFile(filename, mimeType, base64);

        // Open file browser (no-op if already open) and scroll to the new file.
        setFileBrowserOpen(true);
        setHighlightPath(filename);

        // Insert a Markdown link at the cursor in the previously-focused card.
        if (targetTextarea) {
          insertLinkInTextarea(targetTextarea, filename, mimeType);
        }

        // Clear the highlight after a short while.
        setTimeout(() => setHighlightPath(null), 3_000);
      } catch (err) {
        console.error("Clipboard paste upload failed:", err);
      }
    };
  });

  // Register the paste listener once; delegate to the always-current ref.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      pasteHandlerRef.current(e);
    }
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    fetchBoard()
      .then(setBoard)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (board) document.title = board.name;
  }, [board?.name]);

  function toggleDark() { setDarkMode((d) => !d); }

  /** Fetch a API endpoint, check for errors, and update board state from the response. */
  async function apiFetch(url: string, options?: RequestInit): Promise<void> {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setBoard((await res.json()) as Board);
  }

  async function renameBoard(name: string) {
    await apiFetch("/api/board", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
  }

  async function addCard() {
    await apiFetch("/api/cards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "" }),
    });
  }

  async function updateCard(id: number, text: string) {
    await apiFetch(`/api/cards/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    // The server may have enqueued new URLs found in the updated text.
    // Check the queue and start polling so the UI picks up any new embeds.
    try {
      const res = await fetch("/api/embeds/queue");
      if (res.ok) {
        const q = (await res.json()) as EmbedQueueStatus;
        setEmbedQueueStatus(q);
        if (q.pending > 0 || q.processing !== null) startEmbedPolling();
      }
    } catch { /* non-critical, ignore */ }
  }

  async function deleteCard(id: number) {
    await apiFetch(`/api/cards/${id}`, { method: "DELETE" });
  }

  async function addTag(id: number, tag: string) {
    await apiFetch(`/api/cards/${id}/tags`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tag }),
    });
  }

  async function removeTag(id: number, tag: string) {
    await apiFetch(`/api/cards/${id}/tags/${encodeURIComponent(tag)}`, {
      method: "DELETE",
    });
  }

  /** Enqueue a single URL for embed fetching (or refetching). */
  async function fetchEmbed(url: string, refetch: boolean): Promise<void> {
    try {
      const res = await fetch("/api/embeds/fetch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url, refetch }),
      });
      if (!res.ok) return;
      const data = (await res.json()) as { pending: number; processing: string | null };
      setEmbedQueueStatus({ pending: data.pending, processing: data.processing });
      startEmbedPolling();
    } catch (err) {
      console.error("fetchEmbed failed:", err);
    }
  }

  /** Enqueue all uncached URLs found across every card on the board. */
  async function fetchAllMissingEmbeds(): Promise<void> {
    try {
      const res = await fetch("/api/embeds/fetch-all", { method: "POST" });
      if (!res.ok) return;
      const data = (await res.json()) as { queued: number; pending: number; processing: string | null };
      setEmbedQueueStatus({ pending: data.pending, processing: data.processing });
      startEmbedPolling();
    } catch (err) {
      console.error("fetchAllMissingEmbeds failed:", err);
    }
  }

  // ── Embedded file operations ──

  /**
   * Like apiFetch but parses the server's JSON error body so the message
   * shown to the user is meaningful (e.g. "A file already exists at that path"
   * rather than just "HTTP 409").
   */
  async function fileApiFetch(url: string, options?: RequestInit): Promise<void> {
    const res = await fetch(url, options);
    if (!res.ok) {
      let message = `HTTP ${res.status}`;
      try {
        const body = await res.json();
        if (typeof body.error === "string") message = body.error;
      } catch { /* ignore parse errors */ }
      throw new Error(message);
    }
    setBoard((await res.json()) as Board);
  }

  async function uploadFile(path: string, mimeType: string, data: string): Promise<void> {
    await fileApiFetch("/api/files", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path, mime_type: mimeType, data }),
    });
  }

  async function renameFile(oldPath: string, newPath: string): Promise<void> {
    await fileApiFetch(`/api/files/${oldPath}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ new_path: newPath }),
    });
  }

  async function deleteFile(path: string): Promise<void> {
    await fileApiFetch(`/api/files/${path}`, { method: "DELETE" });
  }

  async function reorderCards(newOrder: number[]) {
    // Optimistic update so drag-and-drop feels instant.
    setBoard((prev) => (prev ? { ...prev, card_order: newOrder } : prev));
    try {
      const res = await fetch("/api/card_order", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ card_order: newOrder }),
      });
      if (res.ok) setBoard((await res.json()) as Board);
    } catch (err) {
      // Optimistic update stays; page refresh will restore last saved order.
      console.error("reorderCards failed:", err);
    }
  }

  /**
   * Perform a cross-column card move:
   *   1. Optimistically update local state (tag swap + reorder).
   *   2. Fire three sequential API calls: remove old tag → add new tag → update order.
   *   3. Sync from server once all calls are done (or on error).
   */
  async function moveCardToColumn(
    cardId: number,
    sourceTag: string,
    destTag: string,
    newGlobalOrder: number[],
  ) {
    // Optimistic update
    setBoard((prev) => {
      if (!prev) return prev;
      const card = prev.cards[String(cardId)];
      const newTags = card.tags.filter((t) => t !== sourceTag).concat([destTag]);
      return {
        ...prev,
        card_order: newGlobalOrder,
        cards: { ...prev.cards, [String(cardId)]: { ...card, tags: newTags } },
      };
    });

    try {
      await fetch(`/api/cards/${cardId}/tags/${encodeURIComponent(sourceTag)}`, {
        method: "DELETE",
      });
      await fetch(`/api/cards/${cardId}/tags`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ tag: destTag }),
      });
      await fetch("/api/card_order", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ card_order: newGlobalOrder }),
      });
    } catch (err) {
      console.error("moveCardToColumn failed:", err);
    }
    // Always sync with server after tag changes to get authoritative state.
    setBoard(await fetchBoard());
  }

  if (error) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
        <div class="bg-white dark:bg-gray-800 rounded-xl shadow p-8 text-center max-w-sm">
          <p class="text-red-500 font-semibold text-lg mb-1">Failed to load board</p>
          <p class="text-gray-500 dark:text-gray-400 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-950">
        <p class="text-gray-400 animate-pulse">Loading…</p>
      </div>
    );
  }

  const cards = board.card_order.map((id) => board.cards[String(id)]).filter(Boolean);

  // All unique tags, sorted — used for autocomplete.
  const allTags = [...new Set(Object.values(board.cards).flatMap((c) => c.tags))].sort();

  // All unique category names (part before `:`) — used for the category picker.
  const allCategories = [
    ...new Set(allTags.map((t) => t.slice(0, t.indexOf(":")))),
  ].sort();

  // How many cards carry each exact tag.
  const tagCounts: Record<string, number> = {};
  for (const tag of allTags) {
    tagCounts[tag] = cards.filter((c) => c.tags.includes(tag)).length;
  }

  // How many cards have at least one tag in each category.
  const categoryCounts: Record<string, number> = {};
  for (const cat of allCategories) {
    const prefix = cat + ":";
    categoryCounts[cat] = cards.filter((c) => c.tags.some((t) => t.startsWith(prefix))).length;
  }

  const embedCache: Record<string, EmbedData> = board.embed_cache ?? {};
  const embedQueueSize =
    embedQueueStatus.pending + (embedQueueStatus.processing ? 1 : 0);
  const embeddedFilesRecord: Record<string, EmbeddedFile> = board.embedded_files ?? {};
  const embeddedFiles = Object.values(embeddedFilesRecord).sort(
    (a, b) => a.path.localeCompare(b.path),
  );

  return (
    <div class="h-screen flex flex-col bg-gray-100 dark:bg-gray-950">
      <Header
        boardName={board.name}
        cardCount={cards.length}
        onRename={renameBoard}
        onAddCard={addCard}
        darkMode={darkMode}
        onToggleDark={toggleDark}
        activeCategory={activeCategory}
        allCategories={allCategories}
        categoryCounts={categoryCounts}
        onSelectCategory={setActiveCategory}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        embedQueueSize={embedQueueSize}
        onFetchAllEmbeds={fetchAllMissingEmbeds}
        embeddedFileCount={embeddedFiles.length}
        fileBrowserOpen={fileBrowserOpen}
        onToggleFileBrowser={() => setFileBrowserOpen((v) => !v)}
      />
      <div class="flex flex-1 min-h-0">
        <main class="flex-1 overflow-y-auto min-w-0">
          <div class="max-w-screen-2xl mx-auto p-6">
            {activeCategory ? (
              <CategoryView
                board={board}
                category={activeCategory}
                allTags={allTags}
                tagCounts={tagCounts}
                darkMode={darkMode}
                filterQuery={searchQuery}
                embedCache={embedCache}
                embeddedFiles={embeddedFilesRecord}
                onDelete={deleteCard}
                onUpdate={updateCard}
                onReorder={reorderCards}
                onMoveToColumn={moveCardToColumn}
                onAddTag={addTag}
                onRemoveTag={removeTag}
                onFetchEmbed={fetchEmbed}
              />
            ) : (
              <CardGrid
                cards={cards}
                allTags={allTags}
                tagCounts={tagCounts}
                darkMode={darkMode}
                filterQuery={searchQuery}
                embedCache={embedCache}
                embeddedFiles={embeddedFilesRecord}
                onDelete={deleteCard}
                onUpdate={updateCard}
                onReorder={reorderCards}
                onAddTag={addTag}
                onRemoveTag={removeTag}
                onFetchEmbed={fetchEmbed}
              />
            )}
          </div>
        </main>
        {fileBrowserOpen && (
          <aside class="w-80 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-y-auto flex flex-col">
            <FileBrowser
              files={embeddedFiles}
              highlightPath={highlightPath}
              onClose={() => setFileBrowserOpen(false)}
              onUpload={uploadFile}
              onRename={renameFile}
              onDelete={deleteFile}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

render(<App />, document.getElementById("root")!);
