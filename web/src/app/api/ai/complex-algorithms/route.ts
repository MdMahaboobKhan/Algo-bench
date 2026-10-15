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

const PROMPT = `You are curating advanced distributed-systems and infrastructure algorithms for senior software engineering interview prep.

Generate exactly 18 items as compact JSON only. No Markdown. No prose outside JSON.

Each item must be a concrete algorithm, data structure, protocol, or indexing technique used in real production systems such as databases, Kafka-style logs, Dynamo-style stores, Kubernetes, maps, caches, observability pipelines, search engines, and global-scale services.

Include a diverse mix across consensus, replication, partitioning, storage engines, approximate data structures, geospatial indexing, failure detection, scheduling, rate limiting, streaming, and distributed coordination.

Return this exact JSON shape:
{
  "algorithms": [
    {
      "title": "Raft",
      "body": "One concise sentence describing what it is and where it appears.",
      "bullets": ["core idea 1", "core idea 2", "core idea 3"]
    }
  ]
}

Quality bar:
- Prefer real, named algorithms/protocols like Paxos, Raft, SWIM, CRDTs, LSM trees, Bloom filters, HyperLogLog, consistent hashing, rendezvous hashing, vector clocks, Merkle trees, quorum reads/writes, gossip, H3/S2, token buckets, leaky buckets, skip lists, B+ trees, compaction, leader leases, fencing tokens, two-phase commit, saga orchestration, and log-structured replication.
- Avoid vague generic items like "scaling algorithm".
- Keep every field concise.
- Do not repeat the same algorithm under a different name.`;

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

function isValidAlgorithmList(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const algorithms = (value as { algorithms?: unknown }).algorithms;
  return Array.isArray(algorithms) && algorithms.every((item) => {
    if (!item || typeof item !== "object") return false;
    const algorithm = item as Record<string, unknown>;
    return (
      typeof algorithm.title === "string" &&
      typeof algorithm.body === "string" &&
      Array.isArray(algorithm.bullets) &&
      algorithm.bullets.every((bullet) => typeof bullet === "string")
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
    if (!isValidAlgorithmList(parsed)) throw new Error("AI response did not match the expected algorithm schema");
    return NextResponse.json(parsed);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
