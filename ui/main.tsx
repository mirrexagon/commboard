import { render } from "preact";
import { useEffect, useState } from "preact/hooks";

import { Header } from "./components/Header.tsx";
import { CardItem, type Card } from "./components/CardItem.tsx";

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

// ---- Views ----

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

// ---- CardGrid with drag-and-drop ----

interface CardGridProps {
  cards: Card[];
  darkMode: boolean;
  onDelete: (id: number) => void;
  onReorder: (newOrder: number[]) => void;
}

function CardGrid({ cards, darkMode, onDelete, onReorder }: CardGridProps) {
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dropTargetId, setDropTargetId] = useState<number | null>(null);
  const [dropAtEnd, setDropAtEnd] = useState(false);

  if (cards.length === 0) return <EmptyState />;

  // ---- Drag handlers for individual cards ----

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
    // Must prevent default to allow drop.
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  }

  function handleDrop(e: DragEvent, targetId: number) {
    e.preventDefault();
    if (draggedId === null || draggedId === targetId) {
      reset();
      return;
    }

    const ids = cards.map((c) => c.id);
    const withoutDragged = ids.filter((id) => id !== draggedId);
    const insertIndex = withoutDragged.indexOf(targetId);

    if (insertIndex === -1) {
      reset();
      return;
    }

    withoutDragged.splice(insertIndex, 0, draggedId);
    onReorder(withoutDragged);
    reset();
  }

  function handleDragEnd() {
    reset();
  }

  // ---- Drop zone at the end of the list ----

  function handleEndZoneDragEnter(e: DragEvent) {
    e.preventDefault();
    if (draggedId !== null) {
      setDropAtEnd(true);
      setDropTargetId(null);
    }
  }

  function handleEndZoneDragLeave() {
    setDropAtEnd(false);
  }

  function handleEndZoneDragOver(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
  }

  function handleEndZoneDrop(e: DragEvent) {
    e.preventDefault();
    if (draggedId === null) {
      reset();
      return;
    }
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
            darkMode={darkMode}
            isDragging={draggedId === card.id}
            isDropTarget={dropTargetId === card.id}
            onDelete={() => onDelete(card.id)}
            onDragStart={(e) => handleDragStart(e, card.id)}
            onDragEnter={(e) => handleDragEnter(e, card.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, card.id)}
            onDragEnd={handleDragEnd}
          />
        ))}
      </div>

      {/*
        Drop zone at the end — only visible while a drag is in progress.
        Dragging a card onto this zone moves it to the very end of the list.
      */}
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

// ---- Root ----

function App() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(
    () => localStorage.getItem("darkMode") === "true",
  );

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

  async function deleteCard(id: number) {
    const res = await fetch(`/api/cards/${id}`, { method: "DELETE" });
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

  return (
    <div class="min-h-screen bg-gray-100 dark:bg-gray-950">
      <Header
        boardName={board.name}
        cardCount={cards.length}
        onRename={renameBoard}
        onAddCard={addCard}
        darkMode={darkMode}
        onToggleDark={toggleDark}
      />
      <main class="max-w-screen-2xl mx-auto p-6">
        <CardGrid
          cards={cards}
          darkMode={darkMode}
          onDelete={deleteCard}
          onReorder={reorderCards}
        />
      </main>
    </div>
  );
}

render(<App />, document.getElementById("root")!);
