import { LearningResourcePage } from "@/components/LearningResourcePage";
import { getLearningResource } from "@/lib/prep-hub";

export default function SystemDesignFundamentalsPage() {
  return <LearningResourcePage resource={getLearningResource("fundamentals")!} />;
}
