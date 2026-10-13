import { EngineeringProblemDetail } from "@/components/EngineeringProblemDetail";

export default async function EngineeringProblemCasePage({
  params,
}: {
  params: Promise<{ caseSlug: string }>;
}) {
  const { caseSlug } = await params;
  return <EngineeringProblemDetail caseSlug={caseSlug} />;
}
