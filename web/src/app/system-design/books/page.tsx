import { LearningResourcePage } from "@/components/LearningResourcePage";
import { getLearningResource } from "@/lib/prep-hub";

export default function EngineeringBooksPage() {
  return <LearningResourcePage resource={getLearningResource("books")!} />;
}
