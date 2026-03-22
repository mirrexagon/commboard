import * as esbuild from "npm:esbuild";
import { denoPlugins } from "jsr:@luca/esbuild-deno-loader";
import { fromFileUrl } from "jsr:@std/path";

import { loadOrCreate, save, type Card, type EmbedData } from "./board.ts";

// --- URL extraction ---

/**
 * Extract all http/https URLs from a block of text (e.g. Markdown).
 * Strips trailing punctuation that is unlikely to be part of the URL.
 * Returns a de-duplicated array.
 */
export function extractUrls(text: string): string[] {
    const raw = text.match(/https?:\/\/[^\s\)\]\>"'`\\]+/g) ?? [];
    const cleaned = raw.map((u) => u.replace(/[.,;:!?'")\]>]+$/, ""));
    return [...new Set(cleaned)];
}

// --- HTML parsing helpers ---

function escapeRegex(s: string): string {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function decodeHtmlEntities(s: string): string {
    return s
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
        .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)));
}

/**
 * Extract the `content` attribute from the first `<meta>` tag whose
 * `property` or `name` attribute matches any of the given names (tried
 * in order). Handles both attribute orderings.
 */
function extractMetaContent(
    html: string,
    ...names: string[]
): string | undefined {
    for (const name of names) {
        const escaped = escapeRegex(name);
        // property/name before content
        let m = html.match(
            new RegExp(
                `<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']+)["']`,
                "i",
            ),
        );
        // content before property/name
        if (!m) {
            m = html.match(
                new RegExp(
                    `<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${escaped}["']`,
                    "i",
                ),
            );
        }
        if (m?.[1]) return decodeHtmlEntities(m[1]);
    }
    return undefined;
}

function extractTitle(html: string): string | undefined {
    const m = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return m?.[1] ? decodeHtmlEntities(m[1].trim()) : undefined;
}

/**
 * Resolve `href` against `base`, handling relative paths and protocol-relative
 * URLs gracefully.
 */
function resolveUrl(href: string, base: string): string {
    try {
        return new URL(href, base).href;
    } catch {
        return href;
    }
}

/**
 * Find the best favicon URL from a page's HTML, falling back to
 * `{origin}/favicon.ico`.
 */
function extractFaviconUrl(html: string, pageUrl: string): string {
    const origin = new URL(pageUrl).origin;

    const patterns = [
        // shortcut icon / icon (normal and reversed attribute order)
        /<link[^>]+rel=["'](?:shortcut )?icon["'][^>]+href=["']([^"']+)["']/i,
        /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'](?:shortcut )?icon["']/i,
        // apple-touch-icon as fallback
        /<link[^>]+rel=["']apple-touch-icon(?:-precomposed)?["'][^>]+href=["']([^"']+)["']/i,
        /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']apple-touch-icon(?:-precomposed)?["']/i,
    ];

    for (const pat of patterns) {
        const m = html.match(pat);
        if (m?.[1]) return resolveUrl(m[1], pageUrl);
    }

    return `${origin}/favicon.ico`;
}

// --- Base-64 asset fetching ---

const MAX_ASSET_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Fetch a URL and return it as a base-64 `data:…` string, or `undefined`
 * if the fetch fails, times out, or the resource is too large.
 */
async function fetchAsBase64(url: string): Promise<string | undefined> {
    try {
        const res = await fetch(url, {
            signal: AbortSignal.timeout(15_000),
            headers: { "User-Agent": "Commboard/1.0 embed-bot" },
        });
        if (!res.ok) return undefined;

        const cl = res.headers.get("content-length");
        if (cl && parseInt(cl, 10) > MAX_ASSET_BYTES) return undefined;

        const buf = await res.arrayBuffer();
        if (buf.byteLength > MAX_ASSET_BYTES) return undefined;

        const mimeType = (
            res.headers.get("content-type") ?? "application/octet-stream"
        )
            .split(";")[0]
            .trim();

        // Encode in chunks to avoid call-stack overflow on large buffers.
        const bytes = new Uint8Array(buf);
        let binary = "";
        const CHUNK = 8192;
        for (let i = 0; i < bytes.length; i += CHUNK) {
            binary += String.fromCharCode(
                ...bytes.subarray(i, Math.min(i + CHUNK, bytes.length)),
            );
        }
        return `data:${mimeType};base64,${btoa(binary)}`;
    } catch {
        return undefined;
    }
}

// --- Embed data fetching ---

async function fetchEmbedData(url: string): Promise<EmbedData> {
    const fetched_at = new Date().toISOString();

    let res: Response;
    try {
        res = await fetch(url, {
            signal: AbortSignal.timeout(15_000),
            headers: {
                "User-Agent": "Commboard/1.0 embed-bot",
                Accept: "text/html,application/xhtml+xml,*/*",
            },
        });
    } catch (err) {
        return {
            url,
            fetched_at,
            error: err instanceof Error ? err.message : String(err),
        };
    }

    if (!res.ok) {
        return { url, fetched_at, error: `HTTP ${res.status}` };
    }

    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/html")) {
        // Non-HTML resource: store minimal metadata without images.
        return {
            url,
            fetched_at,
            title:
                new URL(url).pathname.split("/").filter(Boolean).pop() || url,
            description: `${contentType} resource`,
        };
    }

    let html: string;
    try {
        html = await res.text();
    } catch (err) {
        return {
            url,
            fetched_at,
            error: `Failed to read response: ${err instanceof Error ? err.message : String(err)}`,
        };
    }

    const title =
        extractMetaContent(html, "og:title", "twitter:title") ||
        extractTitle(html);
    const description = extractMetaContent(
        html,
        "og:description",
        "twitter:description",
        "description",
    );
    const siteName = extractMetaContent(html, "og:site_name");

    const rawImageUrl = extractMetaContent(html, "og:image", "twitter:image");
    const imageUrl = rawImageUrl ? resolveUrl(rawImageUrl, url) : undefined;
    const faviconUrl = extractFaviconUrl(html, url);

    console.log(
        `  Fetching assets for ${url} (image: ${imageUrl ?? "none"}, favicon: ${faviconUrl})`,
    );
    const [imageData, faviconData] = await Promise.all([
        imageUrl ? fetchAsBase64(imageUrl) : Promise.resolve(undefined),
        fetchAsBase64(faviconUrl),
    ]);

    return {
        url,
        fetched_at,
        title,
        description,
        site_name: siteName,
        image_url: imageUrl,
        image_data: imageData,
        favicon_url: faviconUrl,
        favicon_data: faviconData,
    };
}

// --- Per-domain rate-limited embed fetch queue ---

const DOMAIN_RATE_LIMIT_MS = 2_000; // min ms between fetches to the same domain

const embedQueue = {
    pending: [] as string[],
    processing: null as string | null,
    /** timestamp of the last fetch dispatched for each domain */
    domainLastFetch: new Map<string, number>(),
    running: false,
};

function getDomain(url: string): string {
    try {
        return new URL(url).hostname;
    } catch {
        return url;
    }
}

/**
 * Add `url` to the fetch queue. If it is already pending it is moved to
 * the requested position. If it is currently being processed it is
 * added to the pending list (so it will be re-fetched afterwards).
 */
function enqueueEmbed(url: string, priority: "front" | "back" = "back"): void {
    // Remove any existing entry so we can re-insert at the desired position.
    const idx = embedQueue.pending.indexOf(url);
    if (idx !== -1) embedQueue.pending.splice(idx, 1);

    if (priority === "front") {
        embedQueue.pending.unshift(url);
    } else {
        embedQueue.pending.push(url);
    }

    processEmbedQueue();
}

function processEmbedQueue(): void {
    if (embedQueue.running) return;
    embedQueue.running = true;
    runQueueLoop().finally(() => {
        embedQueue.running = false;
    });
}

async function runQueueLoop(): Promise<void> {
    while (embedQueue.pending.length > 0) {
        const now = Date.now();
        let nextIdx = -1;
        let shortestWait = Infinity;

        for (let i = 0; i < embedQueue.pending.length; i++) {
            const domain = getDomain(embedQueue.pending[i]);
            const lastFetch = embedQueue.domainLastFetch.get(domain) ?? 0;
            const elapsed = now - lastFetch;

            if (elapsed >= DOMAIN_RATE_LIMIT_MS) {
                nextIdx = i;
                break;
            }
            shortestWait = Math.min(shortestWait, DOMAIN_RATE_LIMIT_MS - elapsed);
        }

        if (nextIdx === -1) {
            // All remaining domains are rate-limited; wait for the shortest delay.
            await sleep(shortestWait);
            continue;
        }

        const url = embedQueue.pending.splice(nextIdx, 1)[0];
        embedQueue.processing = url;
        embedQueue.domainLastFetch.set(getDomain(url), Date.now());

        try {
            console.log(`Fetching embed: ${url}`);
            const data = await fetchEmbedData(url);
            // Re-read `board` after the await so we merge into the latest state.
            board = {
                ...board,
                embed_cache: { ...(board.embed_cache ?? {}), [url]: data },
            };
            await save(boardPath, board);
            console.log(
                `Embed cached: ${url} — ${data.error ?? data.title ?? "(no title)"}`,
            );
        } catch (err) {
            console.error(`Queue error for ${url}:`, err);
        }

        embedQueue.processing = null;
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

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
    console.error(
        "UI bundle produced no output — check the build errors above.",
    );
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

    /* Embed preview cards injected inline into card prose.
       Override the prose <a> colour/underline so embeds look like cards. */
    .card-embed { text-decoration: none !important; color: #374151; }
    .dark .card-embed { color: #cbd5e1; }
    .card-embed:hover { text-decoration: none !important; }
  </style>
</head>
<body class="bg-gray-100 min-h-screen">
  <div id="root"></div>
  <script type="module" src="/app.js"></script>
</body>
</html>`;

// --- HTTP helpers ---

function isValidTag(tag: string): boolean {
    const colon = tag.indexOf(":");
    return colon > 0 && colon < tag.length - 1;
}

function jsonOk(data: unknown): Response {
    return new Response(JSON.stringify(data), {
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

function jsonError(message: string, status: number): Response {
    return new Response(JSON.stringify({ error: message }), {
        status,
        headers: { "content-type": "application/json; charset=utf-8" },
    });
}

/** Parse the request body as JSON. Returns the parsed object, or a 400 error Response on failure. */
async function parseJson(
    req: Request,
): Promise<Record<string, unknown> | Response> {
    try {
        return await req.json();
    } catch {
        return jsonError("Invalid JSON", 400);
    }
}

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
            headers: {
                "content-type": "application/javascript; charset=utf-8",
            },
        });
    }

    if (pathname === "/api/board" && req.method === "GET") {
        return jsonOk(board);
    }

    if (pathname === "/api/board" && req.method === "PATCH") {
        const body = await parseJson(req);
        if (body instanceof Response) return body;

        const name = typeof body.name === "string" ? body.name.trim() : null;
        if (!name) {
            return jsonError("name must be a non-empty string", 400);
        }

        board = { ...board, name };
        await save(boardPath, board);

        return jsonOk(board);
    }

    // PATCH /api/cards/:id — update a card's text
    const patchCardMatch = pathname.match(/^\/api\/cards\/(\d+)$/);
    if (patchCardMatch && req.method === "PATCH") {
        const id = parseInt(patchCardMatch[1]);

        if (!board.cards[String(id)]) {
            return jsonError("Card not found", 404);
        }

        const body = await parseJson(req);
        if (body instanceof Response) return body;

        const text = typeof body.text === "string" ? body.text : null;
        if (text === null) {
            return jsonError("text must be a string", 400);
        }

        const updatedCard: Card = { ...board.cards[String(id)], text };
        board = {
            ...board,
            cards: { ...board.cards, [String(id)]: updatedCard },
        };
        await save(boardPath, board);

        // Enqueue any URLs that appear in the updated text but are not yet cached.
        const cache = board.embed_cache ?? {};
        for (const url of extractUrls(text)) {
            if (!(url in cache)) {
                enqueueEmbed(url, "back");
            }
        }

        return jsonOk(board);
    }

    // POST /api/cards — add a new card (optional body: { text?: string })
    if (pathname === "/api/cards" && req.method === "POST") {
        let body: Record<string, unknown> = {};
        try {
            body = await req.json();
        } catch {
            /* body is optional */
        }

        const text = typeof body.text === "string" ? body.text : "";
        const id = board.next_card_id;
        const newCard: Card = { id, text, tags: [] };

        board = {
            ...board,
            cards: { ...board.cards, [String(id)]: newCard },
            next_card_id: board.next_card_id + 1,
            card_order: [...board.card_order, id],
        };
        await save(boardPath, board);

        return jsonOk(board);
    }

    // POST /api/cards/:id/tags — add a tag to a card
    const postTagMatch = pathname.match(/^\/api\/cards\/(\d+)\/tags$/);
    if (postTagMatch && req.method === "POST") {
        const id = parseInt(postTagMatch[1]);

        if (!board.cards[String(id)]) {
            return jsonError("Card not found", 404);
        }

        const body = await parseJson(req);
        if (body instanceof Response) return body;

        const tag = typeof body.tag === "string" ? body.tag.trim() : null;
        if (!tag || !isValidTag(tag)) {
            return jsonError(
                "tag must be a non-empty string in 'category:value' format",
                400,
            );
        }

        const card = board.cards[String(id)];
        if (!card.tags.includes(tag)) {
            const updatedCard: Card = { ...card, tags: [...card.tags, tag] };
            board = {
                ...board,
                cards: { ...board.cards, [String(id)]: updatedCard },
            };
            await save(boardPath, board);
        }

        return jsonOk(board);
    }

    // DELETE /api/cards/:id/tags/:tag — remove a tag from a card (:tag is URL-encoded)
    const deleteTagMatch = pathname.match(/^\/api\/cards\/(\d+)\/tags\/(.+)$/);
    if (deleteTagMatch && req.method === "DELETE") {
        const id = parseInt(deleteTagMatch[1]);
        const tag = decodeURIComponent(deleteTagMatch[2]);

        if (!board.cards[String(id)]) {
            return jsonError("Card not found", 404);
        }

        const card = board.cards[String(id)];
        const updatedCard: Card = {
            ...card,
            tags: card.tags.filter((t) => t !== tag),
        };
        board = {
            ...board,
            cards: { ...board.cards, [String(id)]: updatedCard },
        };
        await save(boardPath, board);

        return jsonOk(board);
    }

    // DELETE /api/cards/:id — remove a card
    const deleteMatch = pathname.match(/^\/api\/cards\/(\d+)$/);
    if (deleteMatch && req.method === "DELETE") {
        const id = parseInt(deleteMatch[1]);

        if (!board.cards[String(id)]) {
            return jsonError("Card not found", 404);
        }

        const { [String(id)]: _removed, ...remainingCards } = board.cards;
        board = {
            ...board,
            cards: remainingCards,
            card_order: board.card_order.filter((cid) => cid !== id),
        };
        await save(boardPath, board);

        return jsonOk(board);
    }

    // PUT /api/card_order — reorder cards
    if (pathname === "/api/card_order" && req.method === "PUT") {
        const body = await parseJson(req);
        if (body instanceof Response) return body;

        if (!Array.isArray(body.card_order)) {
            return jsonError("card_order must be an array", 400);
        }

        const newOrder = (body.card_order as unknown[]).map(Number);
        const existingIds = new Set(board.card_order);
        const newIds = new Set(newOrder);

        if (
            newOrder.length !== board.card_order.length ||
            ![...existingIds].every((id) => newIds.has(id))
        ) {
            return jsonError(
                "card_order must contain exactly the existing card IDs",
                400,
            );
        }

        board = { ...board, card_order: newOrder };
        await save(boardPath, board);

        return jsonOk(board);
    }

    // POST /api/embeds/fetch — enqueue a single URL for fetching / refetching
    if (pathname === "/api/embeds/fetch" && req.method === "POST") {
        const body = await parseJson(req);
        if (body instanceof Response) return body;

        const url = typeof body.url === "string" ? body.url.trim() : null;
        if (!url) return jsonError("url must be a non-empty string", 400);
        try {
            new URL(url);
        } catch {
            return jsonError("url is not a valid URL", 400);
        }

        // Refetch requests jump to the front of the queue so the user gets
        // feedback quickly; regular on-save enqueues go to the back.
        const priority = body.refetch === true ? "front" : "back";
        enqueueEmbed(url, priority);

        return jsonOk({
            queued: true,
            pending: embedQueue.pending.length,
            processing: embedQueue.processing,
        });
    }

    // POST /api/embeds/fetch-all — scan all cards and enqueue every uncached URL
    if (pathname === "/api/embeds/fetch-all" && req.method === "POST") {
        const cache = board.embed_cache ?? {};
        const uncached = new Set<string>();

        for (const card of Object.values(board.cards)) {
            for (const url of extractUrls(card.text)) {
                if (!(url in cache)) uncached.add(url);
            }
        }

        for (const url of uncached) {
            enqueueEmbed(url, "back");
        }

        return jsonOk({
            queued: uncached.size,
            pending: embedQueue.pending.length,
            processing: embedQueue.processing,
        });
    }

    // GET /api/embeds/queue — return current queue status
    if (pathname === "/api/embeds/queue" && req.method === "GET") {
        return jsonOk({
            pending: embedQueue.pending.length,
            processing: embedQueue.processing,
        });
    }

    return new Response("Not Found", { status: 404 });
});
