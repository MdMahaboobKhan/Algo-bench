const COLORS: Record<string, string> = {
  easy: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  hard: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300",
};

export function DifficultyBadge({ difficulty }: { difficulty: string | null }) {
  if (!difficulty) return null;
  return (
    <span
      className={`text-xs rounded px-2 py-0.5 capitalize ${
        COLORS[difficulty] ?? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
      }`}
    >
      {difficulty}
    </span>
  );
}
