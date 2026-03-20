import { useEffect, useRef, useState } from "preact/hooks";

interface Props {
  boardName: string;
  cardCount: number;
  onRename: (name: string) => void;
}

export function Header({ boardName, cardCount, onRename }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(boardName);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keep draft in sync when the prop changes externally.
  useEffect(() => {
    if (!editing) setDraft(boardName);
  }, [boardName, editing]);

  // Auto-focus and select-all when entering edit mode.
  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  function startEditing() {
    setDraft(boardName);
    setEditing(true);
  }

  function commit() {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== boardName) {
      onRename(trimmed);
    } else {
      setDraft(boardName); // reset if empty or unchanged
    }
    setEditing(false);
  }

  function cancel() {
    setDraft(boardName);
    setEditing(false);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") { e.preventDefault(); commit(); }
    if (e.key === "Escape") cancel();
  }

  return (
    <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-baseline gap-3 sticky top-0 z-10 shadow-sm">
      {editing ? (
        <input
          ref={inputRef}
          class="text-xl font-bold text-gray-900 tracking-tight bg-transparent border-b-2 border-blue-500 outline-none leading-tight"
          style="min-width: 8rem; width: auto"
          size={Math.max(draft.length, 4)}
          value={draft}
          onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <h1
          class="text-xl font-bold text-gray-900 tracking-tight cursor-pointer hover:text-blue-600 transition-colors duration-100"
          title="Click to rename"
          onClick={startEditing}
        >
          {boardName}
        </h1>
      )}
      <span class="text-sm text-gray-400 font-medium select-none">
        {cardCount} {cardCount === 1 ? "card" : "cards"}
      </span>
    </header>
  );
}
