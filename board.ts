// --- Types ---

export interface Card {
  id: number;
  text: string;
  tags: string[];
}

export interface EmbeddedFile {
  /** Full path within the virtual filesystem, e.g. "image.png" or "notes/sketch.png". */
  path: string;
  mime_type: string;
  uploaded_at: string;
  /**
   * Raw base64-encoded file data (no data: URI prefix).
   * Stored on disk but stripped from API responses to the frontend;
   * files are served directly via GET /files/:path.
   */
  data?: string;
}

export interface EmbedData {
  /** The canonical URL that was fetched. */
  url: string;
  /** ISO-8601 timestamp of when this embed was last fetched. */
  fetched_at: string;
  /** Set when the fetch or parse failed. */
  error?: string;
  title?: string;
  description?: string;
  /** og:site_name or similar. */
  site_name?: string;
  /** Original image URL (og:image or twitter:image). */
  image_url?: string;
  /** Base-64 data URL for the og:image, cached for offline use. */
  image_data?: string;
  /** Original favicon URL. */
  favicon_url?: string;
  /** Base-64 data URL for the favicon, cached for offline use. */
  favicon_data?: string;
}

export interface Board {
  name: string;
  cards: Record<string, Card>;
  next_card_id: number;
  card_order: number[];
  /** Board-level cache of link embeds, keyed by URL. */
  embed_cache?: Record<string, EmbedData>;
  /** Embedded files keyed by their path within the virtual filesystem. */
  embedded_files?: Record<string, EmbeddedFile>;
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
