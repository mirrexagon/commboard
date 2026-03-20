interface Props {
  boardName: string;
  cardCount: number;
}

export function Header({ boardName, cardCount }: Props) {
  return (
    <header class="bg-white border-b border-gray-200 px-6 py-4 flex items-baseline gap-3 sticky top-0 z-10 shadow-sm">
      <h1 class="text-xl font-bold text-gray-900 tracking-tight">{boardName}</h1>
      <span class="text-sm text-gray-400 font-medium">
        {cardCount} {cardCount === 1 ? "card" : "cards"}
      </span>
    </header>
  );
}
