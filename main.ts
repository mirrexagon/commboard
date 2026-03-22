import * as esbuild from "npm:esbuild";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader";
import { fromFileUrl } from "jsr:@std/path";

import { loadOrCreate, save, type Card } from "./board.ts";

// --- CLI ---

const boardPath = Deno.args[0];

if (!boardPath) {
  console.error("Usage: commboard <path to board file>");
  Deno.exit(1);
}

let board = await loadOrCreate(boardPath);
console.log(`Board: "${board.name}" — ${board.card_order.length} card(s)`);

// --- Bundle UI ---

console.log("Bundling UI...");

const buildResult = await esbuild.build({
  // Cast needed: @luca/esbuild-deno-loader ships its own esbuild type stubs
  // which diverge slightly from the npm:esbuild types at the same version.
  plugins: [
    ...denoPlugins({
      configPath: fromFileUrl(import.meta.resolve("./deno.json")),
    }),
  ] as unknown as esbuild.Plugin[],
  entryPoints: [import.meta.resolve("./ui/main.tsx")],
  bundle: true,
  write: false,
  format: "esm",
  jsx: "automatic",
  jsxImportSource: "preact",
});

esbuild.stop();

if (!buildResult.outputFiles?.length) {
  console.error("UI bundle produced no output — check the build errors above.");
  Deno.exit(1);
}

const bundledJs = buildResult.outputFiles[0].text;
console.log("UI bundled.");

// --- HTTP Server ---

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Commboard</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>tailwind.config = { darkMode: 'class' }</script>
  <style>
    /* Prose styles for Markdown rendered inside cards.
       Tailwind CDN can't see innerHTML so we define these by hand. */
    .card-prose { font-size: 0.875rem; line-height: 1.65; color: #374151; }
    .card-prose h1 { font-size: 1rem; font-weight: 700; color: #0f172a; margin-bottom: 0.4rem; line-height: 1.35; }
    .card-prose h2 { font-size: 0.9375rem; font-weight: 600; color: #1e293b; margin-bottom: 0.3rem; line-height: 1.35; }
    .card-prose h3 { font-size: 0.875rem; font-weight: 600; color: #334155; margin-bottom: 0.25rem; }
    .card-prose p  { margin-bottom: 0.5rem; }
    .card-prose p:last-child { margin-bottom: 0; }
    .card-prose ul { list-style-type: disc;     padding-left: 1.25rem; margin-bottom: 0.5rem; }
    .card-prose ol { list-style-type: decimal;  padding-left: 1.25rem; margin-bottom: 0.5rem; }
    .card-prose li { margin-bottom: 0.1rem; }
    .card-prose a  { color: #2563eb; text-decoration: underline; }
    .card-prose a:hover { color: #1d4ed8; }
    .card-prose strong { font-weight: 600; color: #1e293b; }
    .card-prose em     { color: #475569; }
    .card-prose code   { background: #f1f5f9; padding: 0.1rem 0.35rem; border-radius: 0.25rem;
                         font-size: 0.8125rem; font-family: ui-monospace, monospace; color: #be185d; }
    .card-prose pre    { background: #f8fafc; border: 1px solid #e2e8f0; padding: 0.75rem;
                         border-radius: 0.5rem; overflow-x: auto; margin-bottom: 0.5rem; }
    .card-prose pre code { background: none; padding: 0; color: #334155; }
    .card-prose blockquote { border-left: 3px solid #cbd5e1; padding-left: 0.75rem;
                             color: #64748b; margin-bottom: 0.5rem; }
    .card-prose hr { border: none; border-top: 1px solid #e2e8f0; margin: 0.6rem 0; }

    /* Dark-mode overrides for card prose */
    .dark .card-prose { color: #cbd5e1; }
    .dark .card-prose h1 { color: #f1f5f9; }
    .dark .card-prose h2 { color: #e2e8f0; }
    .dark .card-prose h3 { color: #cbd5e1; }
    .dark .card-prose a  { color: #60a5fa; }
    .dark .card-prose a:hover { color: #93c5fd; }
    .dark .card-prose strong { color: #e2e8f0; }
    .dark .card-prose em     { color: #94a3b8; }
    .dark .card-prose code   { background: #1e293b; color: #f472b6; }
    .dark .card-prose pre    { background: #0f172a; border-color: #334155; }
    .dark .card-prose pre code { color: #cbd5e1; }
    .dark .card-prose blockquote { border-left-color: #475569; color: #94a3b8; }
    .dark .card-prose hr { border-top-color: #334155; }
  </style>
</head>
<body class="bg-gray-100 min-h-screen">
  <div id="root"></div>
  <script type="module" src="/app.js"></script>
</body>
</html>`;

const PORT = 8080;

console.log(`Listening at http://localhost:${PORT}`);

Deno.serve({ port: PORT }, async (req: Request): Promise<Response> => {
  const { pathname } = new URL(req.url);

  if (pathname === "/") {
    return new Response(HTML, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }

  if (pathname === "/app.js") {
    return new Response(bundledJs, {
      headers: { "content-type": "application/javascript; charset=utf-8" },
    });
  }

  if (pathname === "/api/board" && req.method === "GET") {
    return new Response(JSON.stringify(board), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  if (pathname === "/api/board" && req.method === "PATCH") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    const name = typeof body.name === "string" ? body.name.trim() : null;
    if (!name) {
      return new Response(JSON.stringify({ error: "name must be a non-empty string" }), {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    board = { ...board, name };
    await save(boardPath, board);

    return new Response(JSON.stringify(board), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  // PATCH /api/cards/:id — update a card's text
  const patchCardMatch = pathname.match(/^\/api\/cards\/(\d+)$/);
  if (patchCardMatch && req.method === "PATCH") {
    const id = parseInt(patchCardMatch[1]);

    if (!board.cards[String(id)]) {
      return new Response(JSON.stringify({ error: "Card not found" }), {
        status: 404,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    const text = typeof body.text === "string" ? body.text : null;
    if (text === null) {
      return new Response(JSON.stringify({ error: "text must be a string" }), {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    const updatedCard: Card = { ...board.cards[String(id)], text };
    board = { ...board, cards: { ...board.cards, [String(id)]: updatedCard } };
    await save(boardPath, board);

    return new Response(JSON.stringify(board), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  // POST /api/cards — add a new card (optional body: { text?: string })
  if (pathname === "/api/cards" && req.method === "POST") {
    let body: Record<string, unknown> = {};
    try { body = await req.json(); } catch { /* body is optional */ }

    const text = typeof body.text === "string" ? body.text : "New card";
    const id = board.next_card_id;
    const newCard: Card = { id, text, tags: [] };

    board = {
      ...board,
      cards: { ...board.cards, [String(id)]: newCard },
      next_card_id: board.next_card_id + 1,
      card_order: [...board.card_order, id],
    };
    await save(boardPath, board);

    return new Response(JSON.stringify(board), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  // POST /api/cards/:id/tags — add a tag to a card
  const postTagMatch = pathname.match(/^\/api\/cards\/(\d+)\/tags$/);
  if (postTagMatch && req.method === "POST") {
    const id = parseInt(postTagMatch[1]);

    if (!board.cards[String(id)]) {
      return new Response(JSON.stringify({ error: "Card not found" }), {
        status: 404,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    const tag = typeof body.tag === "string" ? body.tag.trim() : null;
    if (!tag || !tag.includes(":") || tag.indexOf(":") === 0 || tag.indexOf(":") === tag.length - 1) {
      return new Response(
        JSON.stringify({ error: "tag must be a non-empty string in 'category:value' format" }),
        { status: 400, headers: { "content-type": "application/json; charset=utf-8" } },
      );
    }

    const card = board.cards[String(id)];
    if (!card.tags.includes(tag)) {
      const updatedCard: Card = { ...card, tags: [...card.tags, tag] };
      board = { ...board, cards: { ...board.cards, [String(id)]: updatedCard } };
      await save(boardPath, board);
    }

    return new Response(JSON.stringify(board), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  // DELETE /api/cards/:id/tags/:tag — remove a tag from a card (:tag is URL-encoded)
  const deleteTagMatch = pathname.match(/^\/api\/cards\/(\d+)\/tags\/(.+)$/);
  if (deleteTagMatch && req.method === "DELETE") {
    const id = parseInt(deleteTagMatch[1]);
    const tag = decodeURIComponent(deleteTagMatch[2]);

    if (!board.cards[String(id)]) {
      return new Response(JSON.stringify({ error: "Card not found" }), {
        status: 404,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    const card = board.cards[String(id)];
    const updatedCard: Card = { ...card, tags: card.tags.filter((t) => t !== tag) };
    board = { ...board, cards: { ...board.cards, [String(id)]: updatedCard } };
    await save(boardPath, board);

    return new Response(JSON.stringify(board), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  // DELETE /api/cards/:id — remove a card
  const deleteMatch = pathname.match(/^\/api\/cards\/(\d+)$/);
  if (deleteMatch && req.method === "DELETE") {
    const id = parseInt(deleteMatch[1]);

    if (!board.cards[String(id)]) {
      return new Response(JSON.stringify({ error: "Card not found" }), {
        status: 404,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    const { [String(id)]: _removed, ...remainingCards } = board.cards;
    board = {
      ...board,
      cards: remainingCards,
      card_order: board.card_order.filter((cid) => cid !== id),
    };
    await save(boardPath, board);

    return new Response(JSON.stringify(board), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  // PUT /api/card_order — reorder cards
  if (pathname === "/api/card_order" && req.method === "PUT") {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    if (!Array.isArray(body.card_order)) {
      return new Response(JSON.stringify({ error: "card_order must be an array" }), {
        status: 400,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    const newOrder = (body.card_order as unknown[]).map(Number);
    const existingIds = new Set(board.card_order);
    const newIds = new Set(newOrder);

    if (
      newOrder.length !== board.card_order.length ||
      ![...existingIds].every((id) => newIds.has(id))
    ) {
      return new Response(
        JSON.stringify({ error: "card_order must contain exactly the existing card IDs" }),
        { status: 400, headers: { "content-type": "application/json; charset=utf-8" } },
      );
    }

    board = { ...board, card_order: newOrder };
    await save(boardPath, board);

    return new Response(JSON.stringify(board), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  return new Response("Not Found", { status: 404 });
});
