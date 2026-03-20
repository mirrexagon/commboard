import { render } from "preact";
import { useEffect, useState } from "preact/hooks";

interface Board {
  name: string;
  card_order: number[];
}

function App() {
  const [board, setBoard] = useState<Board | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/board")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Board) => setBoard(data))
      .catch((err: Error) => setError(err.message));
  }, []);

  if (error) return <p>Error loading board: {error}</p>;
  if (!board) return <p>Loading…</p>;

  return (
    <div>
      <h1>{board.name}</h1>
      <p>{board.card_order.length} card(s)</p>
    </div>
  );
}

render(<App />, document.getElementById("root")!);
