import * as esbuild from "npm:esbuild";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader";
import { fromFileUrl } from "jsr:@std/path";

import { loadOrCreate, save } from "./board.ts";

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

  return new Response("Not Found", { status: 404 });
});
