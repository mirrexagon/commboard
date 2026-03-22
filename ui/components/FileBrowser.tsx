import { useEffect, useRef, useState } from "preact/hooks";
import type { EmbeddedFile } from "../../board.ts";
import {
  encodePath,
  insertLinkAtActiveElement,
  readFileAsBase64,
} from "../lib/files.ts";

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

// ── FileEntry ─────────────────────────────────────────────────────────────────

interface FileEntryProps {
  file: EmbeddedFile;
  highlighted?: boolean;
  onRename: (oldPath: string, newPath: string) => Promise<void>;
  onDelete: (path: string) => Promise<void>;
}

function FileEntry({ file, highlighted = false, onRename, onDelete }: FileEntryProps) {
  const [renaming, setRenaming] = useState(false);
  const [draftPath, setDraftPath] = useState(file.path);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [feedback, setFeedback] = useState<"copied" | "inserted" | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const rowRef = useRef<HTMLDivElement>(null);

  // Scroll this entry into view whenever it becomes the highlighted file
  // (e.g. immediately after a clipboard paste upload).
  useEffect(() => {
    if (highlighted) {
      rowRef.current?.scrollIntoView({ block: "nearest" });
    }
  }, [highlighted]);

  function showFeedback(type: "copied" | "inserted") {
    setFeedback(type);
    if (feedbackTimerRef.current !== null) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
      feedbackTimerRef.current = null;
    }, 1500) as unknown as number;
  }

  /**
   * When a card textarea has focus, clicking the filename inserts a Markdown
   * link at the cursor. Otherwise it falls back to copying the file URL.
   *
   * Clicking a non-focusable <p> element does not blur the textarea, so
   * document.activeElement is still the textarea when this click handler fires.
   */
  function handleFilenameClick() {
    if (document.activeElement instanceof HTMLTextAreaElement) {
      insertLinkAtActiveElement(file.path, file.mime_type);
      showFeedback("inserted");
    } else {
      navigator.clipboard.writeText(`/files/${file.path}`).then(() =>
        showFeedback("copied")
      );
    }
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
      ref={rowRef}
      class={[
        "flex items-start gap-3 px-4 py-3",
        "border-b border-gray-100 dark:border-gray-700 last:border-b-0",
        "hover:bg-gray-50 dark:hover:bg-gray-800/60",
        "group transition-colors duration-300",
        highlighted ? "bg-blue-50 dark:bg-blue-900/20" : "",
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
              title="Click to insert link at cursor (while editing a card), or copy URL"
              onMouseDown={(e) => e.preventDefault()}
              onClick={handleFilenameClick}
            >
              {file.path}
            </p>
            {feedback === "copied" && (
              <p class="text-xs text-green-500 dark:text-green-400 mt-0.5">
                ✓ Copied
              </p>
            )}
            {feedback === "inserted" && (
              <p class="text-xs text-blue-500 dark:text-blue-400 mt-0.5">
                ✓ Inserted
              </p>
            )}
            <p class="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {file.mime_type} · {formatDate(file.uploaded_at)}
            </p>
          </>
        )}
      </div>

      {/* Action buttons — revealed on row hover */}
      {!renaming && (
        <div class="flex items-center gap-0.5 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100">
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
  /** Path of the file to scroll to and briefly highlight (e.g. after a paste upload). */
  highlightPath?: string | null;
  onClose: () => void;
  onUpload: (path: string, mimeType: string, data: string) => Promise<void>;
  onRename: (oldPath: string, newPath: string) => Promise<void>;
  onDelete: (path: string) => Promise<void>;
}

export function FileBrowser({
  files,
  highlightPath,
  onClose,
  onUpload,
  onRename,
  onDelete,
}: FileBrowserProps) {
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [fileFilter, setFileFilter] = useState("");

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

  const filterTrimmed = fileFilter.trim().toLowerCase();
  const visible = filterTrimmed
    ? sorted.filter((f) => f.path.toLowerCase().includes(filterTrimmed))
    : sorted;

  return (
    <div class="flex flex-col h-full">
      {/* Panel header */}
      <div class="flex items-center gap-2.5 px-4 py-3.5 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <span class="text-base select-none">📁</span>
          <h2 class="text-sm font-semibold text-gray-800 dark:text-gray-200 flex-1">
            Embedded Files
          </h2>
          <span class="text-xs text-gray-400 dark:text-gray-500 select-none">
            {filterTrimmed
              ? `${visible.length} / ${files.length}`
              : `${files.length}`}{" "}
            {files.length === 1 ? "file" : "files"}
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

        {/* Filename filter input */}
        {sorted.length > 0 && (
          <div class="px-4 pb-2 flex-shrink-0">
            <div class="relative flex items-center">
              {/* Magnifying-glass icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 16 16"
                fill="currentColor"
                class="absolute left-2 w-3.5 h-3.5 text-gray-400 dark:text-gray-500 pointer-events-none"
              >
                <path
                  fill-rule="evenodd"
                  d="M9.965 11.026a5 5 0 1 1 1.06-1.06l2.755 2.754a.75.75 0 1 1-1.06 1.06l-2.755-2.754ZM10.5 7a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0Z"
                  clip-rule="evenodd"
                />
              </svg>
              <input
                type="text"
                value={fileFilter}
                onInput={(e) => setFileFilter((e.target as HTMLInputElement).value)}
                placeholder="Filter by filename…"
                class={[
                  "w-full text-xs pl-7 py-1.5 rounded-lg border outline-none transition-all duration-150",
                  "bg-gray-50 dark:bg-gray-800",
                  "text-gray-700 dark:text-gray-300",
                  "placeholder-gray-400 dark:placeholder-gray-500",
                  fileFilter
                    ? "border-blue-400 dark:border-blue-500 bg-white dark:bg-gray-900 pr-6"
                    : "border-gray-200 dark:border-gray-700 pr-2 focus:border-blue-400 focus:bg-white dark:focus:bg-gray-900",
                ].join(" ")}
                spellcheck={false}
              />
              {/* Clear button — only shown when there is a query */}
              {fileFilter && (
                <button
                  class="absolute right-1.5 flex items-center justify-center w-4 h-4 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-100 cursor-pointer"
                  title="Clear filter"
                  aria-label="Clear filename filter"
                  onClick={() => setFileFilter("")}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" class="w-3 h-3">
                    <path d="M3.22 3.22a.75.75 0 0 1 1.06 0L8 6.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L9.06 8l3.72 3.72a.75.75 0 1 1-1.06 1.06L8 9.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L6.94 8 3.22 4.28a.75.75 0 0 1 0-1.06Z" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        )}

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
          ) : visible.length === 0 ? (
            <div class="flex flex-col items-center justify-center h-40 text-center px-6 select-none">
              <p class="text-sm text-gray-400 dark:text-gray-500">
                No files match "{fileFilter.trim()}"
              </p>
              <button
                class="text-xs text-blue-500 dark:text-blue-400 mt-1 hover:underline cursor-pointer"
                onClick={() => setFileFilter("")}
              >
                Clear filter
              </button>
            </div>
          ) : (
            <div class="border-t border-gray-100 dark:border-gray-700">
              {visible.map((file) => (
                <FileEntry
                  key={file.path}
                  file={file}
                  highlighted={file.path === highlightPath}
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
