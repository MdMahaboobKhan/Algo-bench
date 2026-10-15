import Link from "next/link";
import { notFound } from "next/navigation";
import { DesignChallengeDetail } from "@/components/DesignChallengeDetail";
import { getSystemDesignChallenge, getSystemDesignChallenges } from "@/lib/system-design";

export function generateStaticParams() {
  return getSystemDesignChallenges().map((challenge) => ({ slug: challenge.slug }));
}

export default async function SystemDesignDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const challenge = getSystemDesignChallenge(slug);
  if (!challenge) notFound();

  return (
    <div className="py-8">
      <div className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href="/system-design" className="hover:underline">
          System Design
        </Link>
        {" / "}
        <span>{challenge.title}</span>
      </div>
      <DesignChallengeDetail challenge={challenge} />
    </div>
  );
}
