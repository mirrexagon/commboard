import { useEffect, useRef, useState } from "preact/hooks"; // useEffect used in FileEntry
import type { EmbeddedFile } from "../../board.ts";

// ── Helpers ───────────────────────────────────────────────────────────────────

function fileIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "🖼️";
  if (mimeType.startsWith("audio/")) return "🎵";
  if (mimeType.startsWith("video/")) return "🎬";
  if (mimeType === "application/pdf") return "📄";
  if (mimeType.startsWith("text/")) return "📝";
  return "📎";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** Read a browser File as raw base64 (no data: URI prefix). */
function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const comma = dataUrl.indexOf(",");
      resolve(comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl);
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Encode a virtual filesystem path for use in a URL:
 * each component is percent-encoded but `/` separators are preserved.
 */
function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

/**
 * Insert a Markdown link (or image link) to an embedded file at the cursor
 * position in whichever <textarea> currently has focus.
 *
 * Uses `onMouseDown` + `e.preventDefault()` on the trigger button to prevent
 * the textarea from blurring before the click fires, so `document.activeElement`
 * is still the textarea when this runs.
 *
 * Dispatches a synthetic `input` event after mutating `el.value` so that
 * Preact's controlled component (CardItem's `draft` state) stays in sync via
 * its existing `handleInput` → `setDraft(el.value)` path.
 */
function insertLinkAtCursor(path: string, mimeType: string): void {
  const el = document.activeElement;
  if (!(el instanceof HTMLTextAreaElement)) return;

  const isImage = mimeType.startsWith("image/");
  const filename = path.split("/").pop() ?? path;
  const href = `/files/${encodePath(path)}`;
  // Use image syntax for images so they render inline; plain link for everything else.
  const linkText = isImage ? `![${filename}](${href})` : `[${filename}](${href})`;

  const start = el.selectionStart;
  const end = el.selectionEnd;
  const newValue = el.value.slice(0, start) + linkText + el.value.slice(end);

  el.value = newValue;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  // Place cursor after the inserted text.
  el.selectionStart = el.selectionEnd = start + linkText.length;
}

// ── FileEntry ─────────────────────────────────────────────────────────────────

interface FileEntryProps {
  file: EmbeddedFile;
  onRename: (oldPath: string, newPath: string) => Promise<void>;
  onDelete: (path: string) => Promise<void>;
}

function FileEntry({ file, onRename, onDelete }: FileEntryProps) {
  const [renaming, setRenaming] = useState(false);
  const [draftPath, setDraftPath] = useState(file.path);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const copyTimerRef = useRef<number | null>(null);

  function handleCopyPath() {
    const url = `/files/${file.path}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      if (copyTimerRef.current !== null) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopied(false);
        copyTimerRef.current = null;
      }, 1500) as unknown as number;
    });
  }

  // Keep draft in sync if the file prop changes from the outside (e.g. after
  // a successful rename the board state updates and the component is replaced).
  useEffect(() => {
    if (!renaming) setDraftPath(file.path);
  }, [file.path, renaming]);

  useEffect(() => {
    if (renaming) inputRef.current?.select();
  }, [renaming]);

  async function commitRename() {
    const trimmed = draftPath.trim();
    if (!trimmed || trimmed === file.path) {
      setRenaming(false);
      setRenameError(null);
      return;
    }
    try {
      await onRename(file.path, trimmed);
      setRenaming(false);
      setRenameError(null);
    } catch (e) {
      setRenameError(e instanceof Error ? e.message : "Rename failed");
      // Keep input focused so the user can correct the path.
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }

  function cancelRename() {
    setRenaming(false);
    setDraftPath(file.path);
    setRenameError(null);
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      await onDelete(file.path);
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div
      class={[
        "flex items-start gap-3 px-4 py-3",
        "border-b border-gray-100 dark:border-gray-700 last:border-b-0",
        "hover:bg-gray-50 dark:hover:bg-gray-800/60",
        "group",
        deleting ? "opacity-50 pointer-events-none" : "",
      ].join(" ")}
    >
      {/* Type icon */}
      <span class="text-lg leading-none mt-0.5 flex-shrink-0 select-none">
        {fileIcon(file.mime_type)}
      </span>

      {/* Path + metadata */}
      <div class="flex-1 min-w-0">
        {renaming ? (
          <>
            <input
              ref={inputRef}
              class={[
                "w-full text-xs px-2 py-1 rounded border outline-none font-mono",
                "bg-white dark:bg-gray-800",
                "text-gray-800 dark:text-gray-200",
                renameError
                  ? "border-red-400 dark:border-red-600"
                  : "border-blue-400 dark:border-blue-500",
              ].join(" ")}
              value={draftPath}
              onInput={(e) => {
                setDraftPath((e.target as HTMLInputElement).value);
                setRenameError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  commitRename();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  e.stopPropagation();
                  cancelRename();
                }
              }}
              onBlur={commitRename}
              spellcheck={false}
            />
            {renameError ? (
              <p class="text-xs text-red-500 dark:text-red-400 mt-0.5">
                {renameError}
              </p>
            ) : (
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5 select-none">
                Enter to save · Esc to cancel
              </p>
            )}
          </>
        ) : (
          <>
            <p
              class="text-xs font-mono text-gray-700 dark:text-gray-300 break-all leading-snug cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-100"
              title="Click to copy file URL"
              onClick={handleCopyPath}
            >
              {file.path}
              {copied && (
                <span class="ml-1.5 text-green-500 dark:text-green-400 font-sans not-italic">
                  ✓ Copied
                </span>
              )}
            </p>
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {file.mime_type} · {formatDate(file.uploaded_at)}
            </p>
          </>
        )}
      </div>

      {/* Action buttons — revealed on row hover */}
      {!renaming && (
        <div class="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
          {/* Insert link at cursor — mousedown preventDefault keeps textarea focused */}
          <button
            title="Insert link into card being edited"
            class="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors cursor-pointer"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => insertLinkAtCursor(file.path, file.mime_type)}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              class="w-3.5 h-3.5"
            >
              <path d="M8.914 6.025a.75.75 0 0 1 1.06 0 3.75 3.75 0 0 1 0 5.304l-1.26 1.26a3.75 3.75 0 0 1-5.303-5.303l.611-.612a.75.75 0 0 1 1.063 1.06l-.611.613a2.25 2.25 0 0 0 3.182 3.182l1.259-1.26a2.25 2.25 0 0 0 0-3.182.75.75 0 0 1 0-1.062Z" />
              <path d="M7.086 9.975a.75.75 0 0 1-1.06 0 3.75 3.75 0 0 1 0-5.304l1.26-1.26a3.75 3.75 0 0 1 5.303 5.303l-.611.612a.75.75 0 0 1-1.063-1.06l.611-.613a2.25 2.25 0 0 0-3.182-3.182l-1.259 1.26a2.25 2.25 0 0 0 0 3.182.75.75 0 0 1 0 1.062Z" />
            </svg>
          </button>

          {/* Open in new tab */}
          <a
            href={`/files/${encodePath(file.path)}`}
            target="_blank"
            rel="noopener noreferrer"
            title="Open file in new tab"
            class="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              class="w-3.5 h-3.5"
            >
              <path d="M6.22 8.72a.75.75 0 0 0 1.06 1.06l5.22-5.22v1.69a.75.75 0 0 0 1.5 0v-3.5a.75.75 0 0 0-.75-.75h-3.5a.75.75 0 0 0 0 1.5h1.69L6.22 8.72Z" />
              <path d="M3.5 6.75c0-.69.56-1.25 1.25-1.25H7A.75.75 0 0 0 7 4H4.75A2.75 2.75 0 0 0 2 6.75v4.5A2.75 2.75 0 0 0 4.75 14h4.5A2.75 2.75 0 0 0 12 11.25V9a.75.75 0 0 0-1.5 0v2.25c0 .69-.56 1.25-1.25 1.25h-4.5c-.69 0-1.25-.56-1.25-1.25v-4.5Z" />
            </svg>
          </a>

          {/* Rename */}
          <button
            title="Rename / move file"
            class="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors cursor-pointer"
            onClick={() => {
              setDraftPath(file.path);
              setRenaming(true);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              class="w-3.5 h-3.5"
            >
              <path d="M13.488 2.513a1.75 1.75 0 0 0-2.475 0L6.75 6.776a2.75 2.75 0 0 0-.596.892l-.848 2.047a.75.75 0 0 0 .98.98l2.047-.848a2.75 2.75 0 0 0 .892-.596l4.263-4.264a1.75 1.75 0 0 0 0-2.474Z" />
              <path d="M4.75 3.5c-.69 0-1.25.56-1.25 1.25v6.5c0 .69.56 1.25 1.25 1.25h6.5c.69 0 1.25-.56 1.25-1.25V9a.75.75 0 0 1 1.5 0v2.25A2.75 2.75 0 0 1 11.25 14h-6.5A2.75 2.75 0 0 1 2 11.25v-6.5A2.75 2.75 0 0 1 4.75 2H7a.75.75 0 0 1 0 1.5H4.75Z" />
            </svg>
          </button>

          {/* Delete */}
          <button
            title="Delete file"
            class="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
            onClick={handleDelete}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              class="w-3.5 h-3.5"
            >
              <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ── UploadZone ────────────────────────────────────────────────────────────────

interface UploadZoneProps {
  uploading: boolean;
  onFiles: (files: File[]) => void;
}

function UploadZone({ uploading, onFiles }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer?.files?.length) {
      onFiles(Array.from(e.dataTransfer.files));
    }
  }

  function handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) {
      onFiles(Array.from(input.files));
      input.value = ""; // reset so the same file can be re-uploaded
    }
  }

  return (
    <div
      class={[
        "mx-4 mb-3 rounded-xl border-2 border-dashed transition-colors duration-150",
        "flex flex-col items-center justify-center gap-1.5 py-5",
        uploading
          ? "opacity-50 pointer-events-none border-gray-200 dark:border-gray-600"
          : dragOver
            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 cursor-copy"
            : "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-700 cursor-pointer",
      ].join(" ")}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
      onClick={() => !uploading && fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        class="hidden"
        onChange={handleChange}
      />
      <span class="text-2xl select-none">{uploading ? "⏳" : "📁"}</span>
      <span class="text-xs text-gray-500 dark:text-gray-400 select-none text-center px-4 leading-snug">
        {uploading ? "Uploading…" : "Drop files here or click to browse"}
      </span>
    </div>
  );
}

// ── FileBrowser ───────────────────────────────────────────────────────────────

export interface FileBrowserProps {
  files: EmbeddedFile[];
  onClose: () => void;
  onUpload: (path: string, mimeType: string, data: string) => Promise<void>;
  onRename: (oldPath: string, newPath: string) => Promise<void>;
  onDelete: (path: string) => Promise<void>;
}

export function FileBrowser({
  files,
  onClose,
  onUpload,
  onRename,
  onDelete,
}: FileBrowserProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);

  async function handleFiles(incoming: File[]) {
    setUploading(true);
    setUploadErrors([]);
    const errors: string[] = [];
    for (const file of incoming) {
      try {
        const base64 = await readFileAsBase64(file);
        const mimeType = file.type || "application/octet-stream";
        await onUpload(file.name, mimeType, base64);
      } catch (e) {
        errors.push(
          `${file.name}: ${e instanceof Error ? e.message : "Upload failed"}`,
        );
      }
    }
    setUploading(false);
    if (errors.length) setUploadErrors(errors);
  }

  const sorted = [...files].sort((a, b) => a.path.localeCompare(b.path));

  return (
    <div class="flex flex-col h-full">
      {/* Panel header */}
      <div class="flex items-center gap-2.5 px-4 py-3.5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <span class="text-base select-none">📁</span>
          <h2 class="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-1">
            Embedded Files
          </h2>
          <span class="text-xs text-gray-400 dark:text-gray-500 select-none">
            {files.length} {files.length === 1 ? "file" : "files"}
          </span>
          <button
            class="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            onClick={onClose}
            title="Close (Esc)"
            aria-label="Close file browser"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="currentColor"
              class="w-4 h-4"
            >
              <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
            </svg>
          </button>
        </div>

        {/* Upload area */}
        <div class="flex-shrink-0 pt-4">
          <UploadZone onFiles={handleFiles} uploading={uploading} />
          {uploadErrors.length > 0 && (
            <div class="mx-4 mb-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-3 py-2 space-y-0.5">
              {uploadErrors.map((err, i) => (
                <p key={i} class="text-xs text-red-600 dark:text-red-400">
                  {err}
                </p>
              ))}
            </div>
          )}
        </div>

        {/* Divider with label */}
        {sorted.length > 0 && (
          <div class="px-4 pb-1 flex-shrink-0">
            <p class="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide select-none">
              Files
            </p>
          </div>
        )}

        {/* File list — scrollable */}
        <div class="flex-1 overflow-y-auto">
          {sorted.length === 0 ? (
            <div class="flex flex-col items-center justify-center h-40 text-center px-6 select-none">
              <p class="text-sm text-gray-400 dark:text-gray-500">
                No files yet
              </p>
              <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Upload files using the area above.
              </p>
            </div>
          ) : (
            <div class="border-t border-gray-100 dark:border-gray-700">
              {sorted.map((file) => (
                <FileEntry
                  key={file.path}
                  file={file}
                  onRename={onRename}
                  onDelete={onDelete}
                />
              ))}
            </div>
          )}
        </div>
    </div>
  );
}
