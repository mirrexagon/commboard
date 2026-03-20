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
      <p class="text-gray-500 font-medium">No cards yet</p>
      <p class="text-gray-400 text-sm mt-1">Cards you add will appear here.</p>
    </div>
  );
}

function CardGrid({ cards }: { cards: Card[] }) {
  if (cards.length === 0) return <EmptyState />;

  return (
    // auto-fill grid: cards are at least 280 px wide and grow to fill the row.
    <div
      class="grid gap-4 items-start"
      style="grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))"
    >
      {cards.map((card) => (
        <CardItem key={card.id} card={card} />
      ))}
    </div>
  );
}

// ---- Root ----

function App() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchBoard()
      .then(setBoard)
      .catch((err: Error) => setError(err.message));
  }, []);

  // Keep the browser tab title in sync with the board name.
  useEffect(() => {
    if (board) document.title = board.name;
  }, [board?.name]);

  async function renameBoard(name: string) {
    const res = await fetch("/api/board", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setBoard(await res.json() as Board);
  }

  if (error) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-gray-100">
        <div class="bg-white rounded-xl shadow p-8 text-center max-w-sm">
          <p class="text-red-500 font-semibold text-lg mb-1">Failed to load board</p>
          <p class="text-gray-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div class="min-h-screen flex items-center justify-center bg-gray-100">
        <p class="text-gray-400 animate-pulse">Loading…</p>
      </div>
    );
  }

  const cards = board.card_order
    .map((id) => board.cards[String(id)])
    .filter(Boolean);

  return (
    <div class="min-h-screen bg-gray-100">
      <Header boardName={board.name} cardCount={cards.length} onRename={renameBoard} />
      <main class="max-w-screen-2xl mx-auto p-6">
        <CardGrid cards={cards} />
      </main>
    </div>
  );
}

render(<App />, document.getElementById("root")!);
