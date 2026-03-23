#!/usr/bin/env python3
"""
Migrate a Commboard board.json (old single-file format) to the new
directory-based format.

Old layout
----------
  board.json
    embed_cache[url].image_data    — "data:<mime>;base64,..." string
    embed_cache[url].favicon_data  — "data:<mime>;base64,..." string
    embedded_files[path].data      — raw base64 string

New layout
----------
  <output-dir>/
    board.json          — all JSON metadata, no binary blobs
    embed-content/
      <sha256-of-asset-url>.<ext>  — raw image / favicon bytes
    files/
      <original-virtual-path>      — uploaded file bytes, preserving subdirs

Usage
-----
  python migrate.py <board.json> <output-dir>

The output directory must not already exist.
"""

import base64
import hashlib
import json
import sys
from pathlib import Path


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

MIME_TO_EXT: dict[str, str] = {
    "image/jpeg":               ".jpg",
    "image/jpg":                ".jpg",
    "image/png":                ".png",
    "image/gif":                ".gif",
    "image/webp":               ".webp",
    "image/svg+xml":            ".svg",
    "image/x-icon":             ".ico",
    "image/vnd.microsoft.icon": ".ico",
    "image/bmp":                ".bmp",
    "image/avif":               ".avif",
}


def mime_to_ext(mime: str) -> str:
    return MIME_TO_EXT.get(mime.lower().split(";")[0].strip(), "")


def decode_data_url(data_url: str) -> tuple[str, bytes]:
    """Split a 'data:<mime>;base64,<data>' string into (mime, raw_bytes)."""
    header, _, b64 = data_url.partition(",")
    mime = header.split(":")[1].split(";")[0]
    return mime, base64.b64decode(b64)


def asset_url_to_filename(asset_url: str, mime: str) -> str:
    """Reproduce the filename logic used by main.ts: SHA-256(url) + ext."""
    sha = hashlib.sha256(asset_url.encode()).hexdigest()
    return sha + mime_to_ext(mime)


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main() -> None:
    if len(sys.argv) != 3:
        print(f"Usage: {sys.argv[0]} <board.json> <output-dir>", file=sys.stderr)
        sys.exit(1)

    input_path = Path(sys.argv[1])
    output_dir = Path(sys.argv[2])

    if not input_path.is_file():
        print(f"Error: {input_path} is not a file.", file=sys.stderr)
        sys.exit(1)

    if output_dir.exists():
        print(f"Error: {output_dir} already exists. Choose a new path.", file=sys.stderr)
        sys.exit(1)

    with input_path.open(encoding="utf-8") as fh:
        board: dict = json.load(fh)

    output_dir.mkdir(parents=True)
    embed_content_dir = output_dir / "embed-content"
    files_dir = output_dir / "files"

    # ------------------------------------------------------------------
    # embed_cache — extract image_data / favicon_data into embed-content/
    # ------------------------------------------------------------------
    embed_cache: dict = board.get("embed_cache") or {}
    new_embed_cache: dict = {}
    image_count = 0
    favicon_count = 0

    for page_url, entry in embed_cache.items():
        new_entry = {
            k: v for k, v in entry.items()
            if k not in ("image_data", "favicon_data")
        }

        if image_data := entry.get("image_data"):
            try:
                mime, raw = decode_data_url(image_data)
                asset_url = entry.get("image_url") or (page_url + ":image")
                filename = asset_url_to_filename(asset_url, mime)
                embed_content_dir.mkdir(exist_ok=True)
                (embed_content_dir / filename).write_bytes(raw)
                new_entry["image_file"] = filename
                new_entry["image_mime"] = mime
                image_count += 1
            except Exception as exc:
                print(f"  Warning: could not save OG image for {page_url}: {exc}")

        if favicon_data := entry.get("favicon_data"):
            try:
                mime, raw = decode_data_url(favicon_data)
                asset_url = entry.get("favicon_url") or (page_url + ":favicon")
                filename = asset_url_to_filename(asset_url, mime)
                embed_content_dir.mkdir(exist_ok=True)
                (embed_content_dir / filename).write_bytes(raw)
                new_entry["favicon_file"] = filename
                new_entry["favicon_mime"] = mime
                favicon_count += 1
            except Exception as exc:
                print(f"  Warning: could not save favicon for {page_url}: {exc}")

        new_embed_cache[page_url] = new_entry

    # ------------------------------------------------------------------
    # embedded_files — decode base64 data into files/
    # ------------------------------------------------------------------
    embedded_files: dict = board.get("embedded_files") or {}
    new_embedded_files: dict = {}
    file_count = 0

    for vpath, file_entry in embedded_files.items():
        new_entry = {k: v for k, v in file_entry.items() if k != "data"}

        if raw_b64 := file_entry.get("data"):
            try:
                raw = base64.b64decode(raw_b64)
                dest = files_dir / vpath
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_bytes(raw)
                file_count += 1
            except Exception as exc:
                print(f"  Warning: could not save embedded file '{vpath}': {exc}")

        new_embedded_files[vpath] = new_entry

    # ------------------------------------------------------------------
    # Write board.json (strip the old top-level keys, replace with new)
    # ------------------------------------------------------------------
    new_board = {
        k: v for k, v in board.items()
        if k not in ("embed_cache", "embedded_files")
    }
    if new_embed_cache:
        new_board["embed_cache"] = new_embed_cache
    if new_embedded_files:
        new_board["embedded_files"] = new_embedded_files

    (output_dir / "board.json").write_text(
        json.dumps(new_board, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------
    old_size = input_path.stat().st_size
    new_json_size = (output_dir / "board.json").stat().st_size

    print(f"Migration complete → {output_dir}")
    print(f"  board.json:     {old_size:>10,} bytes  →  {new_json_size:>10,} bytes")
    print(f"  OG images:      {image_count}")
    print(f"  Favicons:       {favicon_count}")
    print(f"  Embedded files: {file_count}")
    if embed_content_dir.exists():
        ec_files = list(embed_content_dir.iterdir())
        print(f"  embed-content/: {len(ec_files)} file(s)")
    if files_dir.exists():
        all_files = [p for p in files_dir.rglob("*") if p.is_file()]
        print(f"  files/:         {len(all_files)} file(s)")


if __name__ == "__main__":
    main()
