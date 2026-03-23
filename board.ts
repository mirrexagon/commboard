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
  // Raw file content is stored on disk at <boardDir>/files/<path>.
  // It is never written into board.json.
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
  /**
   * Filename inside <boardDir>/embed-content/ for the cached OG image.
   * Named as SHA-256(image_url) + native extension derived from MIME type.
   */
  image_file?: string;
  /** MIME type of the cached image file, e.g. "image/png". */
  image_mime?: string;
  /** Reason the OG image asset could not be fetched/cached. */
  image_data_error?: string;
  /** Original favicon URL. */
  favicon_url?: string;
  /**
   * Filename inside <boardDir>/embed-content/ for the cached favicon.
   * Named as SHA-256(favicon_url) + native extension derived from MIME type.
   */
  favicon_file?: string;
  /** MIME type of the cached favicon file. */
  favicon_mime?: string;
  /** Reason the favicon asset could not be fetched/cached. */
  favicon_data_error?: string;
  /**
   * MIME content-type of the fetched resource.  Only set for non-HTML
   * resources (direct file downloads).  Absent for HTML page embeds.
   */
  content_type?: string;
  /**
   * Set by boardForClient (not stored on disk): true when image_file is set.
   */
  image_cached?: boolean;
  /**
   * Set by boardForClient (not stored on disk): true when favicon_file is set.
   */
  favicon_cached?: boolean;
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
  // Strip trailing slash before splitting so "path/to/dir/" works correctly.
  return path.replace(/[/\\]+$/, "").split(/[/\\]/).pop() ?? path;
}

// --- Persistence ---

/**
 * Load the board from `boardDir/board.json`, creating the directory and an
 * empty board file if they do not yet exist.
 *
 * Board layout:
 *   <boardDir>/board.json          — all JSON data (no binary blobs)
 *   <boardDir>/embed-content/      — cached embed images and favicons
 *   <boardDir>/files/              — uploaded embedded files (real directory tree)
 */
export async function loadOrCreate(boardDir: string): Promise<Board> {
  const jsonPath = `${boardDir}/board.json`;

  let text: string;
  try {
    text = await Deno.readTextFile(jsonPath);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      const name = basename(boardDir);
      const board = emptyBoard(name);
      await Deno.mkdir(boardDir, { recursive: true });
      await Deno.writeTextFile(jsonPath, JSON.stringify(board, null, 2));
      console.log(`Created new board: ${boardDir}`);
      return board;
    }
    throw err;
  }

  try {
    return JSON.parse(text) as Board;
  } catch {
    throw new Error(`Board file is not valid JSON: ${jsonPath}`);
  }
}

export async function save(boardDir: string, board: Board): Promise<void> {
  await Deno.writeTextFile(
    `${boardDir}/board.json`,
    JSON.stringify(board, null, 2),
  );
}
