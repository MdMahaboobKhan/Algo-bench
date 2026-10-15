import { NextRequest, NextResponse } from "next/server";
import { generateAiText } from "@/lib/ai-server";
import type { AiProviderId } from "@/lib/ai-providers";

interface Body {
  provider?: AiProviderId;
  apiKey?: string;
  model?: string;
  bedrockRegion?: string;
  bedrockSecretAccessKey?: string;
  bedrockSessionToken?: string;
}

const PROMPT = `You are curating advanced real-world engineering case studies for senior software engineering interview prep.

Generate exactly 12 case studies as compact JSON only. No Markdown. No prose outside JSON.

Each case study must be based on a recognizable real-world product/company and an engineering problem that could plausibly appear in a system design or engineering deep-dive interview.

Include diverse companies/products such as Uber, Stripe, DoorDash, Netflix, Databricks, Snowflake, Google Maps, WhatsApp, Discord, Shopify, Airbnb, Cloudflare, LinkedIn, Meta, Amazon, Kafka/Confluent, Figma, Notion, Robinhood, Coinbase, etc. Do not repeat a company in the same list.

Return this exact JSON shape:
{
  "problems": [
    {
      "company": "Stripe",
      "title": "How Stripe guarantees idempotent payment APIs",
      "scenario": "One sentence describing the real product situation.",
      "whyHard": "One sentence explaining why this is technically difficult.",
      "coreIdeas": ["idempotency keys", "dedupe store", "retry-safe state machine"],
      "interviewPrompt": "Design a system that...",
      "deepDiveQuestions": ["question 1", "question 2", "question 3"]
    }
  ]
}

Quality bar:
- Make the topics concrete and product-specific.
- Focus on backend/distributed systems/data/infra problems.
- Avoid generic titles like 'Design a notification system'.
- Include case studies like nearest riders, idempotency, delivery pricing, lakehouse metadata, warehouse query optimization, feed ranking, fraud detection, feature stores, multiplayer collaboration, global routing, etc.
- Keep each field concise.`;

function extractJson(text: string): unknown {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("AI response was not valid JSON");
  }
}

function isValidProblemList(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const problems = (value as { problems?: unknown }).problems;
  return Array.isArray(problems) && problems.every((item) => {
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

export async function POST(req: NextRequest) {
  let body: Body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!body.apiKey) {
    return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
  }

  try {
    const result = await generateAiText({
      provider: body.provider,
      apiKey: body.apiKey,
      model: body.model,
      bedrockRegion: body.bedrockRegion,
      bedrockSecretAccessKey: body.bedrockSecretAccessKey,
      bedrockSessionToken: body.bedrockSessionToken,
      prompt: PROMPT,
      maxOutputTokens: 8192,
    });
    const parsed = extractJson(result.text);
    if (!isValidProblemList(parsed)) throw new Error("AI response did not match the expected problem schema");
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
