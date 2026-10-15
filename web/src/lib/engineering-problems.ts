export const ENGINEERING_PROBLEMS_SESSION_KEY = "algobench:session-engineering-problems";
export const ENGINEERING_PROBLEMS_CACHE_KEY = "algobench:engineering-problems-cache";

export interface EngineeringProblem {
  company: string;
  title: string;
  scenario: string;
  whyHard: string;
  coreIdeas: string[];
  interviewPrompt: string;
  deepDiveQuestions: string[];
}

export interface EngineeringProblemsCache {
  version: 1;
  source: "ai" | "examples";
  providerId?: string;
  providerName: string;
  model?: string;
  generatedAt: string;
  problems: EngineeringProblem[];
}

export function isEngineeringProblemArray(value: unknown): value is EngineeringProblem[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const problem = item as Record<string, unknown>;
    return (
      typeof problem.company === "string" &&
      typeof problem.title === "string" &&
      typeof problem.scenario === "string" &&
      typeof problem.whyHard === "string" &&
      Array.isArray(problem.coreIdeas) &&
      typeof problem.interviewPrompt === "string" &&
      Array.isArray(problem.deepDiveQuestions)
    );
  });
}

export function isEngineeringProblemsCache(value: unknown): value is EngineeringProblemsCache {
  if (!value || typeof value !== "object") return false;
  const cache = value as Record<string, unknown>;
  return (
    cache.version === 1 &&
    (cache.source === "ai" || cache.source === "examples") &&
    typeof cache.providerName === "string" &&
    typeof cache.generatedAt === "string" &&
    isEngineeringProblemArray(cache.problems)
  );
}

export function engineeringProblemSlug(problem: EngineeringProblem): string {
  return `${problem.company}-${problem.title}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function fallbackEngineeringProblems(): EngineeringProblem[] {
  return [
    {
      company: "Uber",
      title: "How Uber finds nearby riders and drivers in real time",
      scenario: "Millions of moving drivers and riders need low-latency matching by location.",
      whyHard: "The system must handle geospatial indexing, freshness, surge zones, and constantly changing supply.",
      coreIdeas: ["H3/S2 indexing", "location streams", "candidate ranking"],
      interviewPrompt: "Design a realtime marketplace matching service for riders and drivers.",
      deepDiveQuestions: ["How do you keep driver locations fresh?", "How do you avoid hot city-center cells?", "How would surge pricing consume this data?"],
    },
    {
      company: "Stripe",
      title: "How Stripe ensures idempotent payment APIs",
      scenario: "Clients retry payment requests after network failures without knowing whether the first request succeeded.",
      whyHard: "Duplicate charges are unacceptable, but retries are mandatory in unreliable networks.",
      coreIdeas: ["idempotency keys", "dedupe store", "payment state machine"],
      interviewPrompt: "Design an idempotent payments API that is safe under retries and partial failures.",
      deepDiveQuestions: ["What is the idempotency key scope?", "How long do you retain dedupe records?", "What happens if two payloads use the same key?"],
    },
    {
      company: "DoorDash",
      title: "How DoorDash prices and assigns delivery offers",
      scenario: "Delivery offers depend on distance, courier supply, batching, merchant prep time, and customer promise times.",
      whyHard: "The pricing and assignment decision is a fast-changing optimization problem with marketplace feedback loops.",
      coreIdeas: ["ETA prediction", "marketplace optimization", "feature pipelines"],
      interviewPrompt: "Design a delivery pricing and assignment engine for a three-sided marketplace.",
      deepDiveQuestions: ["How do you price long-tail delivery zones?", "How do you prevent stale ETAs?", "How would you A/B test pricing changes?"],
    },
  ];
}
