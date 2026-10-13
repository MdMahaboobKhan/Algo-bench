import { NextRequest, NextResponse } from "next/server";
import { generateAiText } from "@/lib/ai-server";
import type { AiProviderId } from "@/lib/ai-providers";

interface ExplainBody {
  provider?: AiProviderId;
  apiKey?: string;
  model?: string;
  topic?: string;
  category?: string;
  context?: string;
  bullets?: string[];
  bedrockRegion?: string;
  bedrockSecretAccessKey?: string;
  bedrockSessionToken?: string;
}

function buildPrompt(body: ExplainBody): string {
  return `You are a senior distributed-systems engineer teaching an advanced interview-prep topic.

Topic: ${body.topic}
Category: ${body.category}
Context: ${body.context}
Seed bullets:
${(body.bullets ?? []).map((b) => `- ${b}`).join("\n")}

Write a detailed but practical explanation in Markdown with these sections:
1. What it is
2. Why it exists in real systems
3. The core idea / mental model
4. Step-by-step flow
5. Real-world systems that use this idea
6. Tradeoffs and failure modes
7. Interview-ready explanation
8. A small concrete example

Formatting rules:
- Use Markdown headings and bullet lists.
- Use Markdown tables only when a table is useful.
- Do NOT use ASCII-art boxes, ASCII diagrams, or wide fixed-width diagrams.
- In the Step-by-step flow section, include one Mermaid diagram when the topic has a flow, protocol, lifecycle, request path, or state transition.
- Mermaid diagrams must use a fenced code block with language exactly mermaid.
- Prefer simple Mermaid syntax: flowchart TD, sequenceDiagram, or stateDiagram-v2. Keep node labels short and quote labels that contain punctuation.
- Do NOT use LaTeX/math delimiters like $...$; use plain text arrows like -> or →.
- Use non-Mermaid fenced code blocks only for actual code or compact pseudocode.
- Keep the answer complete and self-contained. Prefer concise depth over endless detail.

Avoid fluff. Use precise engineering language. Do not mention that you are an AI.`;
}

export async function POST(req: NextRequest) {
  let body: ExplainBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!body.apiKey || !body.topic) {
    return NextResponse.json({ error: "apiKey and topic are required" }, { status: 400 });
  }

  try {
    const result = await generateAiText({
      provider: body.provider,
      apiKey: body.apiKey,
      model: body.model,
      bedrockRegion: body.bedrockRegion,
      bedrockSecretAccessKey: body.bedrockSecretAccessKey,
      bedrockSessionToken: body.bedrockSessionToken,
      prompt: buildPrompt(body),
      maxOutputTokens: 8192,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
