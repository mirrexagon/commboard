## Development guidelines

- DESIGN.md is the hub for design and development documentation.
- After implementing a feature, if it is listed in DESIGN.md, check it off.

## Tech stack

| Layer | Technology | Notes |
|---|---|---|
| Runtime | Deno | Built-in TypeScript, no node_modules |
| Server | `Deno.serve` (stdlib) | Single process, handles HTTP |
| UI bundler | `npm:esbuild` + `jsr:@luca/esbuild-deno-loader` | Runs once at server startup |
| Frontend framework | Preact 10 | React-compatible, 3 KB |
| CSS | Tailwind Play CDN | Script tag in HTML; no build step |
| Markdown | `npm:marked` | Bundled into the frontend JS |

## File structure

```
main.ts               # Entrypoint: CLI arg parsing, UI bundling, HTTP server, API routes
board.ts              # Board/Card types and persistence (server-side only)
deno.json             # Tasks, import map for frontend deps, JSX compiler options
ui/
  main.tsx            # Preact app root, data fetching, top-level state
  components/
    Header.tsx        # Sticky top bar (board name, card count)
    CardItem.tsx      # Individual card (Markdown body + tag chips)
  lib/
    colors.ts         # Deterministic tag-category → colour palette mapping
```

`board.ts` uses `Deno.*` APIs and must not be imported from frontend code. The
frontend defines its own copies of the `Board` / `Card` interfaces.

## Running the app

```bash
deno task start path/to/board.json
```

This is equivalent to:
```bash
deno run --allow-read --allow-write --allow-net --allow-run --allow-env main.ts path/to/board.json
```

`--allow-run` is required because `npm:esbuild` spawns a native esbuild binary.

The UI is bundled **at server startup**, not at build time. There is no separate
build step and no hot-reload — restart the server to pick up UI changes.

## Type checking

```bash
deno check main.ts
deno check ui/main.tsx
```

Run this before end-to-end testing. It is much faster than starting the server
and catches most mistakes immediately.

## End-to-end testing pattern

There are example board files in `example-boards/`.

Use a `trap` so the server process is always killed when the bash script exits,
including on error or tool timeout. Poll for readiness instead of sleeping a
fixed amount.

```bash
# Start the server
deno run --allow-read --allow-write --allow-net --allow-run --allow-env \
  main.ts /tmp/test-board.json &
SERVER_PID=$!

# Always clean up, even if the script errors or times out
trap 'kill "$SERVER_PID" 2>/dev/null; wait "$SERVER_PID" 2>/dev/null' EXIT

# Wait for the server to be ready (poll up to ~10 s)
for i in $(seq 20); do
  curl -sf http://localhost:8080/ > /dev/null 2>&1 && break
  sleep 0.5
done

# Run tests
curl -sf http://localhost:8080/api/board
# ...

# Cleanup is automatic via the trap — no explicit kill needed at the end
```

Important notes:
- Do **not** wrap the `deno run` command in `timeout X`. Let the trap handle cleanup.
- Use a fresh temp file for each test run (e.g. `/tmp/test-board-$$.json`) if
  there is any risk of a previous run having left a stale file.
- The server listens on port 8080. If a previous test left a process running
  (and the trap did not fire, which shouldn't happen), the next bind will fail.
  Run `lsof -ti:8080 | xargs kill` to clear it.

## Adding frontend dependencies

1. Add to the `imports` map in `deno.json`:
   ```json
   "some-lib": "npm:some-lib@2"
   ```
2. Import in frontend code using the bare specifier:
   ```ts
   import { thing } from "some-lib";
   ```
3. Run `deno check ui/main.tsx` — Deno will download the package and type-check.

The `deno.lock` file is committed and updated automatically by Deno when new
imports are first resolved. Do not delete it.

JSR packages used only on the server side (e.g. `jsr:@luca/esbuild-deno-loader`)
are imported directly with their full specifier in `main.ts` and do not need an
entry in the import map.

## Adding API routes

The entire HTTP handler lives in `main.ts` inside the `Deno.serve` callback.
Add new routes there. The handler is `async`. The module-level `let board`
variable holds the current board state; mutate it and call `save(boardPath, board)`
to persist.

## Known quirks

### esbuild plugin type cast

`@luca/esbuild-deno-loader` ships its own copy of the esbuild type definitions
which diverges from the types in `npm:esbuild`. The `plugins` array must be cast:

```ts
plugins: [...denoPlugins({ configPath: "..." })] as unknown as esbuild.Plugin[]
```

This is intentional and safe — the cast is type-only and the plugins work
correctly at runtime.

### Tailwind CDN and innerHTML styles

The Tailwind Play CDN detects class names by scanning the live DOM. It **cannot**
see classes inside `dangerouslySetInnerHTML` content. Any styles needed for
Markdown-rendered card bodies must be written as plain CSS in the `<style>` block
in the HTML template in `main.ts` (see the `.card-prose` rules there).

### Tailwind CDN requires internet on first load

The Play CDN script (`https://cdn.tailwindcss.com`) is fetched from the network
the first time and then cached by the browser. The app will render unstyled if
used offline before the browser has cached the script.
