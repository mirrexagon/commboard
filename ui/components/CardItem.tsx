import { marked } from "marked";
import { tagPalette } from "../lib/colors.ts";

export interface Card {
  id: number;
  text: string;
  tags: string[];
}

interface ParsedTag {
  category: string;
  value: string;
  raw: string;
}

function parseTag(raw: string): ParsedTag {
  const colon = raw.indexOf(":");
  if (colon === -1) return { category: raw, value: "", raw };
  return { category: raw.slice(0, colon), value: raw.slice(colon + 1), raw };
}

interface Props {
  card: Card;
  darkMode: boolean;
}

export function CardItem({ card, darkMode }: Props) {
  // marked.parse() is synchronous when no async extensions are registered.
  const html = marked.parse(card.text) as string;

  const tags = [...card.tags]
    .sort()
    .map(parseTag);

  return (
    <div class="bg-white dark:bg-gray-800 rounded-xl ring-1 ring-black/[0.07] dark:ring-white/[0.08] shadow-sm hover:shadow-md transition-shadow duration-150 flex flex-col min-w-0">

      {/* Card body */}
      <div
        class="card-prose p-4 flex-1 min-w-0 break-words"
        dangerouslySetInnerHTML={{ __html: html }}
      />

      {/* Tags — only rendered when present */}
      {tags.length > 0 && (
        <div class="px-4 pb-3 pt-1 border-t border-gray-100 dark:border-gray-700 flex flex-wrap gap-1.5">
          {tags.map(({ category, value, raw }) => {
            const [bg, text, border] = tagPalette(category, darkMode);
            return (
              <span
                key={raw}
                class={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${bg} ${text} ${border}`}
              >
                <span class="opacity-50 font-normal">{category}</span>
                {value && <span>{value}</span>}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
