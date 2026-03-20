// --- Types ---

export interface Card {
  id: number;
  text: string;
  tags: string[];
}

export interface Board {
  name: string;
  cards: Record<string, Card>;
  next_card_id: number;
  card_order: number[];
}

// --- Helpers ---

function emptyBoard(name: string): Board {
  return {
    name,
    cards: {},
    next_card_id: 1,
    card_order: [],
  };
}

function basename(path: string): string {
  return path.split(/[/\\]/).pop() ?? path;
}

// --- Persistence ---

export async function loadOrCreate(path: string): Promise<Board> {
  let text: string;
  try {
    text = await Deno.readTextFile(path);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      const name = basename(path).replace(/\.json$/i, "");
      const board = emptyBoard(name);
      await save(path, board);
      console.log(`Created new board file: ${path}`);
      return board;
    }
    throw err;
  }

  try {
    return JSON.parse(text) as Board;
  } catch {
    throw new Error(`Board file is not valid JSON: ${path}`);
  }
}

export async function save(path: string, board: Board): Promise<void> {
  await Deno.writeTextFile(path, JSON.stringify(board, null, 2));
}
