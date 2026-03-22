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

/** Re-place cards that belong to a category column back into the global order,
 *  preserving the positions of all other cards.
 *
 *  Example:
 *    globalOrder    = [1, 3, 5, 2, 4]
 *    currentColIds  = [1, 5, 4]   (column cards in their current global order)
 *    newColIds      = [5, 1, 4]   (user's new order for those cards)
 *  → positions of column cards in globalOrder: 0, 2, 4  (sorted ascending)
 *  → newGlobal[0]=5, newGlobal[2]=1, newGlobal[4]=4
 *  → result        = [5, 3, 1, 2, 4]
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
    if (id !== draggedId) {
      setDropTargetId(id);
      setDropAtEnd(false);
    }
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

  function reset() {
    setDraggedId(null);
    setDropTargetId(null);
    setDropAtEnd(false);
  }

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

interface CategoryColumnProps {
  category: string;
  value: string;
  /** Cards that belong in this column, already in global order. */
  cards: Card[];
  allTags: string[];
  darkMode: boolean;
  onDelete: (id: number) => void;
  onUpdate: (id: number, text: string) => void;
  /** Called with the new desired order of card IDs within this column.
   *  The caller maps this back to a new global order. */
  onReorder: (newColumnIds: number[]) => void;
  onAddTag: (id: number, tag: string) => void;
  onRemoveTag: (id: number, tag: string) => void;
}

function CategoryColumn({
  category,
  value,
  cards,
  allTags,
  darkMode,
  onDelete,
  onUpdate,
  onReorder,
  onAddTag,
  onRemoveTag,
}: CategoryColumnProps) {
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [dropAtEnd, setDropAtEnd] = useState(false);

  // Derive the column header color from the tag palette.
  const [bg, text, border] = tagPalette(category, darkMode);

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
    if (id !== draggedId) {
      setDropTargetId(id);
      setDropAtEnd(false);
    }
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

  function reset() {
    setDraggedId(null);
    setDropTargetId(null);
    setDropAtEnd(false);
  }

  return (
    <div class="flex flex-col gap-3 w-72 flex-shrink-0">
      {/* Column header */}
      <div
        class={`flex items-center gap-2 px-3 py-1.5 rounded-lg border font-semibold text-sm select-none ${bg} ${text} ${border}`}
      >
        <span class="opacity-60 font-normal text-xs">{category}</span>
        <span>{value}</span>
        <span class="ml-auto opacity-60 font-normal text-xs">{cards.length}</span>
      </div>

      {/* Cards */}
      <div class="flex flex-col gap-3">
        {cards.length === 0 ? (
          <div class="flex items-center justify-center h-20 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-600 text-xs select-none">
            No cards
          </div>
        ) : (
          cards.map((card) => (
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
          ))
        )}
      </div>

      {/* Drop zone at end of column */}
      {draggedId !== null && (
        <div
          class={[
            "h-12 rounded-xl border-2 border-dashed transition-colors duration-150 flex items-center justify-center",
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
            Move to end
          </span>
        </div>
      )}
    </div>
  );
}

// ---- CategoryView — all columns for the active category ----

interface CategoryViewProps {
  board: Board;
  category: string;
  allTags: string[];
  darkMode: boolean;
  onDelete: (id: number) => void;
  onUpdate: (id: number, text: string) => void;
  onReorder: (newOrder: number[]) => void;
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
  onAddTag,
  onRemoveTag,
}: CategoryViewProps) {
  // All cards in global order.
  const allCards = board.card_order
    .map((id) => board.cards[String(id)])
    .filter(Boolean);

  // Collect all values for this category from all cards, sorted alphabetically.
  const prefix = category + ":";
  const valueSet = new Set<string>();
  for (const card of allCards) {
    for (const tag of card.tags) {
      if (tag.startsWith(prefix)) {
        valueSet.add(tag.slice(prefix.length));
      }
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

  return (
    <div class="flex gap-4 overflow-x-auto pb-4 items-start min-h-64">
      {values.map((value) => {
        const tag = `${category}:${value}`;
        // Cards in this column: those that have the tag, in global order.
        const columnCards = allCards.filter((c) => c.tags.includes(tag));
        const columnIds = columnCards.map((c) => c.id);

        return (
          <CategoryColumn
            key={value}
            category={category}
            value={value}
            cards={columnCards}
            allTags={allTags}
            darkMode={darkMode}
            onDelete={onDelete}
            onUpdate={onUpdate}
            onReorder={(newColumnIds) => {
              // Map the new column order back into the global order.
              onReorder(reorderInCategory(board.card_order, columnIds, newColumnIds));
            }}
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

  // Sync dark class on <html> whenever darkMode changes.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("darkMode", String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    fetchBoard()
      .then(setBoard)
      .catch((err: Error) => setError(err.message));
  }, []);

  // Keep the browser tab title in sync with the board name.
  useEffect(() => {
    if (board) document.title = board.name;
  }, [board?.name]);

  function toggleDark() {
    setDarkMode((d) => !d);
  }

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
      body: JSON.stringify({ text: "New card" }),
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
      // If the request fails the optimistic update stays; a page refresh will
      // restore the last saved order from the server.
    }
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

  const cards = board.card_order
    .map((id) => board.cards[String(id)])
    .filter(Boolean);

  // Collect all unique tags across the board, sorted, for autocomplete.
  const allTags = [...new Set(Object.values(board.cards).flatMap((c) => c.tags))].sort();

  // Derive all unique category names (the part before the colon) for the category picker.
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
