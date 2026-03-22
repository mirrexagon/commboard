/**
 * Shared file utilities used by both the FileBrowser component and the
 * global clipboard-paste handler.
 */

/** Read a browser File as raw base64 (no data: URI prefix). */
export function readFileAsBase64(file: File): Promise<string> {
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
export function encodePath(path: string): string {
  return path.split("/").map(encodeURIComponent).join("/");
}

/**
 * Insert a Markdown link (or image link) to an embedded file at the cursor
 * position in a given <textarea>.
 *
 * Dispatches a synthetic `input` event after mutating `el.value` so that
 * Preact's controlled component (CardItem's `draft` state) stays in sync via
 * its existing `handleInput` → `setDraft(el.value)` path.
 */
export function insertLinkInTextarea(
  el: HTMLTextAreaElement,
  path: string,
  mimeType: string,
): void {
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

/**
 * Insert a Markdown link at the cursor in whichever <textarea> currently has
 * focus.  No-ops if the active element is not a textarea.
 *
 * Uses `onMouseDown` + `e.preventDefault()` on the trigger button so the
 * textarea does not blur before the click fires.
 */
export function insertLinkAtActiveElement(path: string, mimeType: string): void {
  const el = document.activeElement;
  if (!(el instanceof HTMLTextAreaElement)) return;
  insertLinkInTextarea(el, path, mimeType);
}

/**
 * Map a MIME type to a sensible file extension.
 * Falls back to the subtype portion of the MIME string, then "bin".
 */
export function mimeToExt(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/svg+xml": "svg",
    "image/bmp": "bmp",
    "image/tiff": "tif",
    "text/plain": "txt",
    "text/html": "html",
    "application/pdf": "pdf",
  };
  return map[mimeType] ?? mimeType.split("/")[1]?.split("+")[0] ?? "bin";
}
