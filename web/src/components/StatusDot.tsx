import type { ProgressStatus } from "@/lib/db";

const STYLES: Record<ProgressStatus, string> = {
  solved: "bg-green-500 dark:bg-green-400",
  attempted: "bg-amber-500 dark:bg-amber-400",
  unattempted: "bg-zinc-300 dark:bg-zinc-700",
};

const LABELS: Record<ProgressStatus, string> = {
  solved: "Solved",
  attempted: "Attempted",
  unattempted: "Unattempted",
};

export function StatusDot({ status }: { status: ProgressStatus }) {
  return (
    <span
      className={`inline-block h-2.5 w-2.5 rounded-full ${STYLES[status]}`}
      title={LABELS[status]}
      aria-label={LABELS[status]}
    />
  );
}
