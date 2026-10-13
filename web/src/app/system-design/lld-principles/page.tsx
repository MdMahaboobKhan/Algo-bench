import { LearningResourcePage } from "@/components/LearningResourcePage";
import { getLearningResource } from "@/lib/prep-hub";

export default function LldPrinciplesPage() {
  return <LearningResourcePage resource={getLearningResource("lld-principles")!} />;
}
