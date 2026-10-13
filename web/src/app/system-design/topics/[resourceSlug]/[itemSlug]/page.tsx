import Link from "next/link";
import { notFound } from "next/navigation";
import { TopicExplanation } from "@/components/TopicExplanation";
import {
  getLearningResourceItem,
  getLearningResources,
  learningItemSlug,
} from "@/lib/prep-hub";

export function generateStaticParams() {
  return getLearningResources().flatMap((resource) =>
    resource.items.map((item) => ({
      resourceSlug: resource.slug,
      itemSlug: item.slug ?? learningItemSlug(item.title),
    }))
  );
}

export default async function TopicPage({
  params,
}: {
  params: Promise<{ resourceSlug: string; itemSlug: string }>;
}) {
  const { resourceSlug, itemSlug } = await params;
  const match = getLearningResourceItem(resourceSlug, itemSlug);
  if (!match) notFound();

  return (
    <div className="py-8">
      <div className="mb-4 text-sm text-zinc-500 dark:text-zinc-400">
        <Link href={match.resource.href} className="hover:underline">
          {match.resource.title}
        </Link>
        {" / "}
        <span>{match.item.title}</span>
      </div>
      <TopicExplanation resource={match.resource} item={match.item} />
    </div>
  );
}
