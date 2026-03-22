import { useEffect, useRef, useState } from "preact/hooks";

// ── Category selector with autocomplete ─────────────────────────────────────

interface CategorySelectorProps {
  allCategories: string[];
  onSelect: (category: string) => void;
  onCancel: () => void;
}

function CategorySelector({ allCategories, onSelect, onCancel }: CategorySelectorProps) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const suggestions =
    value.trim().length > 0
      ? allCategories
          .filter((c) => c.toLowerCase().includes(value.toLowerCase()))
          .slice(0, 8)
      : allCategories.slice(0, 8);

  function submit(cat: string) {
    const trimmed = cat.trim();
    if (trimmed) onSelect(trimmed);
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      submit(value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  return (
    <div class="relative">
      <input
        ref={inputRef}
        type="text"
        value={value}
        onInput={(e) => setValue((e.target as HTMLInputElement).value)}
        onKeyDown={handleKeyDown}
        onBlur={onCancel}
        placeholder="category…"
        class={[
          "text-xs px-2.5 py-1 rounded-lg border border-blue-400 outline-none",
          "w-32 bg-white dark:bg-gray-800",
          "text-gray-800 dark:text-gray-200",
          "placeholder-gray-400 dark:placeholder-gray-500",
        ].join(" ")}
        spellcheck={false}
      />
      {suggestions.length > 0 && (
        <div
          class={[
            "absolute top-full left-0 mt-1 z-50",
            "bg-white dark:bg-gray-800",
            "border border-gray-200 dark:border-gray-700",
            "rounded-lg shadow-lg overflow-hidden w-40",
          ].join(" ")}
        >
          {suggestions.map((cat) => (
            <button
              key={cat}
              class="block w-full text-left text-xs px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 text-gray-700 dark:text-gray-300 cursor-pointer"
              onMouseDown={(e) => {
                e.preventDefault();
                submit(cat);
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Header ───────────────────────────────────────────────────────────────────

interface Props {
  boardName: string;
  cardCount: number;
  onRename: (name: string) => void;
  onAddCard: () => void;
  darkMode: boolean;
  onToggleDark: () => void;
  /** The currently active category for grouping, or null for default view. */
  activeCategory: string | null;
  /** All category names present on any card, for autocomplete. */
  allCategories: string[];
  onSelectCategory: (category: string | null) => void;
}

export function Header({
  boardName,
  cardCount,
  onRename,
  onAddCard,
  darkMode,
  onToggleDark,
  activeCategory,
  allCategories,
  onSelectCategory,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(boardName);
  const inputRef = useRef<HTMLInputElement>(null);
  const [pickingCategory, setPickingCategory] = useState(false);

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
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    }
    if (e.key === "Escape") cancel();
  }

  return (
    <header class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-3 sticky top-0 z-10 shadow-sm flex-wrap">
      {/* Board name */}
      {editing ? (
        <input
          ref={inputRef}
          class="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight bg-transparent border-b-2 border-blue-500 outline-none leading-tight"
          style="min-width: 8rem; width: auto"
          size={Math.max(draft.length, 4)}
          value={draft}
          onInput={(e) => setDraft((e.target as HTMLInputElement).value)}
          onBlur={commit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <h1
          class="text-xl font-bold text-gray-900 dark:text-gray-100 tracking-tight cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-100"
          title="Click to rename"
          onClick={startEditing}
        >
          {boardName}
        </h1>
      )}

      <span class="text-sm text-gray-400 dark:text-gray-500 font-medium select-none">
        {cardCount} {cardCount === 1 ? "card" : "cards"}
      </span>

      {/* Spacer */}
      <div class="flex-1" />

      {/* ── View mode switcher ── */}
      <div class="flex items-center gap-1.5">
        {/* "All cards" button */}
        <button
          onClick={() => { onSelectCategory(null); setPickingCategory(false); }}
          class={[
            "text-xs px-2.5 py-1 rounded-lg font-medium transition-colors duration-150 select-none",
            !activeCategory
              ? "bg-blue-600 text-white"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700",
          ].join(" ")}
        >
          All cards
        </button>

        {/* Active category pill (shown when grouped) */}
        {activeCategory && !pickingCategory && (
          <span class="flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg font-medium bg-blue-600 text-white select-none">
            <span class="opacity-75">grouped by</span>
            <span>{activeCategory}</span>
            <button
              class="ml-0.5 hover:text-blue-200 transition-colors duration-100 leading-none cursor-pointer"
              title="Clear grouping"
              onClick={() => onSelectCategory(null)}
            >
              ×
            </button>
          </span>
        )}

        {/* "Group by…" button or category input */}
        {pickingCategory ? (
          <CategorySelector
            allCategories={allCategories}
            onSelect={(cat) => {
              setPickingCategory(false);
              onSelectCategory(cat);
            }}
            onCancel={() => setPickingCategory(false)}
          />
        ) : (
          <button
            onClick={() => setPickingCategory(true)}
            title="Group cards by a category"
            class={[
              "text-xs px-2.5 py-1 rounded-lg font-medium border transition-colors duration-150 select-none",
              activeCategory
                ? "border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500"
                : "border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-500",
            ].join(" ")}
          >
            Group by…
          </button>
        )}
      </div>

      {/* Add card button */}
      <button
        onClick={onAddCard}
        title="Add card"
        class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-medium transition-colors duration-150 select-none"
        aria-label="Add card"
      >
        <span class="text-base leading-none">＋</span>
        <span>Add card</span>
      </button>

      {/* Dark mode toggle */}
      <button
        onClick={onToggleDark}
        title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        class="flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-150 select-none text-base"
        aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
      >
        {darkMode ? "☀️" : "🌙"}
      </button>
    </header>
  );
}
