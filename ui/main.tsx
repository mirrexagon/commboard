import { render } from "preact";
import { useEffect, useState } from "preact/hooks";

import { Header } from "./components/Header.tsx";
import { CardItem, type Card } from "./components/CardItem.tsx";
import { tagPalette } from "./lib/colors.ts";

interface Board {
  name: string;
  cards: Record<string, Card>;
  next_card_id: number;
  card_order: number[];
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

// ---- CardGrid with drag-and-drop (default / all-cards view) ----

interface CardGridProps {
  cards: Card[];
  allTags: string[];
  darkMode: boolean;
  onDelete: (id: number) => void;
  onUpdate: (id: number, text: string) => void;
  onReorder: (newOrder: number[]) => void;
  onAddTag: (id: number, tag: string) => void;
  onRemoveTag: (id: number, tag: string) => void;
}

function CardGrid({ cards, allTags, darkMode, onDelete, onUpdate, onReorder, onAddTag, onRemoveTag }: CardGridProps) {
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [dropAtEnd, setDropAtEnd] = useState(false);

  if (cards.length === 0) return <EmptyState />;

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

    const ids = cards.map((c) => c.id);
    const withoutDragged = ids.filter((id) => id !== draggedId);
    const insertIndex = withoutDragged.indexOf(targetId);
    if (insertIndex === -1) { reset(); return; }

    withoutDragged.splice(insertIndex, 0, draggedId);
    onReorder(withoutDragged);
    reset();
  }

  function handleDragEnd() { reset(); }

  function handleEndZoneDragEnter(e: DragEvent) {
    e.preventDefault();
    if (draggedId !== null) { setDropAtEnd(true); setDropTargetId(null); }
  }

  function handleEndZoneDragLeave() { setDropAtEnd(false); }

  function handleEndZoneDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  }

  function handleEndZoneDrop(e: DragEvent) {
    e.preventDefault();
    if (draggedId === null) { reset(); return; }
    const ids = cards.map((c) => c.id).filter((id) => id !== draggedId);
    ids.push(draggedId);
    onReorder(ids);
    reset();
  }

  function reset() { setDraggedId(null); setDropTargetId(null); setDropAtEnd(false); }

  return (
    <div class="flex flex-col gap-4">
      <div
        class="grid gap-4 items-start"
        style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))"
      >
        {cards.map((card) => (
          <CardItem
            key={card.id}
            card={card}
            allTags={allTags}
            darkMode={darkMode}
            isDragging={draggedId === card.id}
            isDropTarget={dropTargetId === card.id}
            onDelete={() => onDelete(card.id)}
            onUpdate={(text) => onUpdate(card.id, text)}
            onAddTag={(tag) => onAddTag(card.id, tag)}
            onRemoveTag={(tag) => onRemoveTag(card.id, tag)}
            onDragStart={(e) => handleDragStart(e, card.id)}
            onDragEnter={(e) => handleDragEnter(e, card.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, card.id)}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      {draggedId !== null && (
        <div
          class={[
            "h-16 rounded-xl border-2 border-dashed transition-colors duration-150 flex items-center justify-center",
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
      )}
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
  darkMode: boolean;

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
}

function CategoryColumn({
  category,
  value,
  cards,
  allTags,
  darkMode,
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
}: CategoryColumnProps) {
  const [headerBg, headerText, headerBorder] = tagPalette(category, darkMode);

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
        class={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold text-sm select-none ${headerBg} ${headerText} ${headerBorder}`}
      >
        <span class="opacity-60 font-normal text-xs">{category}</span>
        <span>{value}</span>
        <span class="ml-auto opacity-60 font-normal text-xs">{cards.length}</span>
      </div>

      {/* Cards or empty-column drop target */}
      {cards.length === 0 ? (
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
      ) : (
        <div class="flex flex-col gap-3">
          {cards.map((card) => (
            <CardItem
              key={card.id}
              card={card}
              allTags={allTags}
              darkMode={darkMode}
              isDragging={activeDragId === card.id}
              isDropTarget={dropTargetCardId === card.id}
              onDelete={() => onDelete(card.id)}
              onUpdate={(text) => onUpdate(card.id, text)}
              onAddTag={(tag) => onAddTag(card.id, tag)}
              onRemoveTag={(tag) => onRemoveTag(card.id, tag)}
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
      {anyDragActive && cards.length > 0 && (
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
  darkMode: boolean;
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
}

function CategoryView({
  board,
  category,
  allTags,
  darkMode,
  onDelete,
  onUpdate,
  onReorder,
  onMoveToColumn,
  onAddTag,
  onRemoveTag,
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

  return (
    <div class="flex gap-4 overflow-x-auto items-start min-h-64 px-1 py-1 pb-4">
      {values.map((v) => {
        const tag = `${category}:${v}`;
        const columnCards = allCards.filter((c) => c.tags.includes(tag));

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
            cards={columnCards}
            allTags={allTags}
            darkMode={darkMode}
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
          />
        );
      })}
    </div>
  );
}

// ---- Root ----

function App() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(
    () => localStorage.getItem("darkMode") === "true",
  );
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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

  async function renameBoard(name: string) {
    const res = await fetch("/api/board", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setBoard((await res.json()) as Board);
  }

  async function addCard() {
    const res = await fetch("/api/cards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "" }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setBoard((await res.json()) as Board);
  }

  async function updateCard(id: number, text: string) {
    const res = await fetch(`/api/cards/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setBoard((await res.json()) as Board);
  }

  async function deleteCard(id: number) {
    const res = await fetch(`/api/cards/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setBoard((await res.json()) as Board);
  }

  async function addTag(id: number, tag: string) {
    const res = await fetch(`/api/cards/${id}/tags`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tag }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setBoard((await res.json()) as Board);
  }

  async function removeTag(id: number, tag: string) {
    const res = await fetch(`/api/cards/${id}/tags/${encodeURIComponent(tag)}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setBoard((await res.json()) as Board);
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
    } catch {
      // Optimistic update stays; page refresh will restore last saved order.
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
    } catch {
      // Fall through to sync
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

  return (
    <div class="min-h-screen bg-gray-100 dark:bg-gray-950">
      <Header
        boardName={board.name}
        cardCount={cards.length}
        onRename={renameBoard}
        onAddCard={addCard}
        darkMode={darkMode}
        onToggleDark={toggleDark}
        activeCategory={activeCategory}
        allCategories={allCategories}
        onSelectCategory={setActiveCategory}
      />
      <main class="max-w-screen-2xl mx-auto p-6">
        {activeCategory ? (
          <CategoryView
            board={board}
            category={activeCategory}
            allTags={allTags}
            darkMode={darkMode}
            onDelete={deleteCard}
            onUpdate={updateCard}
            onReorder={reorderCards}
            onMoveToColumn={moveCardToColumn}
            onAddTag={addTag}
            onRemoveTag={removeTag}
          />
        ) : (
          <CardGrid
            cards={cards}
            allTags={allTags}
            darkMode={darkMode}
            onDelete={deleteCard}
            onUpdate={updateCard}
            onReorder={reorderCards}
            onAddTag={addTag}
            onRemoveTag={removeTag}
          />
        )}
      </main>
    </div>
  );
}

render(<App />, document.getElementById("root")!);
