import { ComplexAlgorithmDetail } from "@/components/ComplexAlgorithmDetail";

export default async function ComplexAlgorithmPage({
  params,
}: {
  params: Promise<{ algorithmSlug: string }>;
}) {
  const { algorithmSlug } = await params;
  return <ComplexAlgorithmDetail algorithmSlug={algorithmSlug} />;
}
