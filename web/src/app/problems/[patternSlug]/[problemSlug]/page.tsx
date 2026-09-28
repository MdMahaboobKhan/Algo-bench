import Link from "next/link";
import { notFound } from "next/navigation";
import { getManifest, getProblem } from "@/lib/problems";
import { ProblemDetail } from "@/components/ProblemDetail";

export function generateStaticParams() {
  return getManifest().map((p) => {
    const [patternSlug, problemSlug] = p.id.split("/");
    return { patternSlug, problemSlug };
  });
}

export default async function ProblemPage({
  params,
}: {
  params: Promise<{ patternSlug: string; problemSlug: string }>;
}) {
  const { patternSlug, problemSlug } = await params;
  const problem = getProblem(patternSlug, problemSlug);
  if (!problem) notFound();

  return (
    <div className="py-8">
      <div className="text-sm text-zinc-500 dark:text-zinc-400 mb-4">
        <Link href="/" className="hover:underline">
          Patterns
        </Link>
        {" / "}
        <Link href={`/patterns/${patternSlug}`} className="hover:underline">
          {problem.pattern.name}
        </Link>
        {" / "}
        <span>{problem.title}</span>
      </div>
      <ProblemDetail problem={problem} />
    </div>
  );
}
