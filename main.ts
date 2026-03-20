import * as esbuild from "npm:esbuild";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader";
import { fromFileUrl } from "jsr:@std/path";

import { loadOrCreate } from "./board.ts";

// --- CLI ---

const boardPath = Deno.args[0];

if (!boardPath) {
  console.error("Usage: commboard <path to board file>");
  Deno.exit(1);
}

const board = await loadOrCreate(boardPath);
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
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/app.js"></script>
</body>
</html>`;

const PORT = 8080;

console.log(`Listening at http://localhost:${PORT}`);

Deno.serve({ port: PORT }, (req: Request): Response => {
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

  if (pathname === "/api/board") {
    return new Response(JSON.stringify(board), {
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }

  return new Response("Not Found", { status: 404 });
});
