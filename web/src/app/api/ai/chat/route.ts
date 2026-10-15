import { NextRequest, NextResponse } from "next/server";
import { generateAiText } from "@/lib/ai-server";
import type { AiProviderId } from "@/lib/ai-providers";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatBody {
  provider?: AiProviderId;
  apiKey?: string;
  model?: string;
  topic?: string;
  category?: string;
  context?: string;
  bullets?: string[];
  explanation?: string;
  messages?: ChatMessage[];
  bedrockRegion?: string;
  bedrockSecretAccessKey?: string;
  bedrockSessionToken?: string;
}

function systemPrompt(body: ChatBody): string {
  return `You are a senior engineer tutoring a user on one interview-prep topic.

Topic: ${body.topic}
Category: ${body.category}
Context: ${body.context}
Seed concepts:
${(body.bullets ?? []).map((b) => `- ${b}`).join("\n")}

Current generated lesson, if any:
${(body.explanation ?? "").slice(0, 8000)}

Answer the user's follow-up question. Be practical, concise, and specific to this topic.
Use Markdown bullets/headings if helpful.
Do not use ASCII-art diagrams or LaTeX delimiters.
If the user asks for a flow, architecture, lifecycle, sequence, state, or request-path diagram, return a Mermaid diagram in a fenced code block with language exactly mermaid. Prefer simple flowchart TD, sequenceDiagram, or stateDiagram-v2 syntax.`;
}

export async function POST(req: NextRequest) {
  let body: ChatBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!body.apiKey || !body.topic || !body.messages?.length) {
    return NextResponse.json({ error: "apiKey, topic, and messages are required" }, { status: 400 });
  }

  try {
    const result = await generateAiText({
      provider: body.provider,
      apiKey: body.apiKey,
      model: body.model,
      bedrockRegion: body.bedrockRegion,
      bedrockSecretAccessKey: body.bedrockSecretAccessKey,
      bedrockSessionToken: body.bedrockSessionToken,
      prompt: systemPrompt(body),
      messages: body.messages.slice(-12),
      maxOutputTokens: 2048,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
