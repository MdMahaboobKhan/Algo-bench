import crypto from "node:crypto";
import { getAiProvider, type AiProviderId } from "@/lib/ai-providers";

export interface AiMessage {
  role: "user" | "assistant";
  content: string;
}

interface GenerateTextInput {
  provider?: AiProviderId;
  apiKey: string;
  model?: string;
  prompt: string;
  messages?: AiMessage[];
  maxOutputTokens: number;
  bedrockRegion?: string;
  bedrockSecretAccessKey?: string;
  bedrockSessionToken?: string;
}

interface GenerateTextResult {
  text: string;
  truncated: boolean;
  finishReason: string | null;
}

function openAiCompatibleEndpoint(provider: AiProviderId): string {
  switch (provider) {
    case "openai":
      return "https://api.openai.com/v1/chat/completions";
    case "openrouter":
      return "https://openrouter.ai/api/v1/chat/completions";
    case "groq":
      return "https://api.groq.com/openai/v1/chat/completions";
    case "mistral":
      return "https://api.mistral.ai/v1/chat/completions";
    case "deepseek":
      return "https://api.deepseek.com/chat/completions";
    case "xai":
      return "https://api.x.ai/v1/chat/completions";
    default:
      return "https://api.openai.com/v1/chat/completions";
  }
}

function toGeminiRole(role: AiMessage["role"]): "user" | "model" {
  return role === "assistant" ? "model" : "user";
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(value, "utf8").digest("hex");
}

function hmac(key: Buffer | string, value: string): Buffer {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest();
}

function hmacHex(key: Buffer | string, value: string): string {
  return crypto.createHmac("sha256", key).update(value, "utf8").digest("hex");
}

function awsDateParts(date = new Date()): { amzDate: string; dateStamp: string } {
  const iso = date.toISOString().replace(/[:-]|\.\d{3}/g, "");
  return { amzDate: iso, dateStamp: iso.slice(0, 8) };
}

function signBedrockRequest(input: {
  method: string;
  region: string;
  model: string;
  body: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}): { url: string; headers: Record<string, string> } {
  const service = "bedrock";
  const host = `bedrock-runtime.${input.region}.amazonaws.com`;
  const canonicalUri = `/model/${encodeURIComponent(input.model)}/invoke`;
  const { amzDate, dateStamp } = awsDateParts();
  const payloadHash = sha256Hex(input.body);
  const tokenHeader = input.sessionToken ? `x-amz-security-token:${input.sessionToken}\n` : "";
  const signedHeaders = input.sessionToken
    ? "content-type;host;x-amz-content-sha256;x-amz-date;x-amz-security-token"
    : "content-type;host;x-amz-content-sha256;x-amz-date";
  const canonicalHeaders =
    `content-type:application/json\n` +
    `host:${host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n` +
    tokenHeader;
  const canonicalRequest = [
    input.method,
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const credentialScope = `${dateStamp}/${input.region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");
  const kDate = hmac(`AWS4${input.secretAccessKey}`, dateStamp);
  const kRegion = hmac(kDate, input.region);
  const kService = hmac(kRegion, service);
  const kSigning = hmac(kService, "aws4_request");
  const signature = hmacHex(kSigning, stringToSign);
  const authorization = `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
  return {
    url: `https://${host}${canonicalUri}`,
    headers: {
      "Content-Type": "application/json",
      Host: host,
      "X-Amz-Content-Sha256": payloadHash,
      "X-Amz-Date": amzDate,
      Authorization: authorization,
      ...(input.sessionToken ? { "X-Amz-Security-Token": input.sessionToken } : {}),
    },
  };
}

export async function generateAiText(input: GenerateTextInput): Promise<GenerateTextResult> {
  const provider = getAiProvider(input.provider).id;
  const model = input.model?.trim() || getAiProvider(provider).defaultModel;

  if (provider === "gemini") {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(input.apiKey)}`;
    const contents = [
      { role: "user", parts: [{ text: input.prompt }] },
      ...(input.messages ?? []).map((message) => ({
        role: toGeminiRole(message.role),
        parts: [{ text: message.content }],
      })),
    ];
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.35, maxOutputTokens: input.maxOutputTokens },
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message ?? "Gemini request failed");
    const candidate = data?.candidates?.[0];
    const text = candidate?.content?.parts
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("\n")
      .trim();
    return {
      text: text || "No response returned.",
      truncated: candidate?.finishReason === "MAX_TOKENS",
      finishReason: candidate?.finishReason ?? null,
    };
  }

  if (provider === "anthropic") {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": input.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: input.maxOutputTokens,
        temperature: 0.35,
        system: input.prompt,
        messages: (input.messages?.length ? input.messages : [{ role: "user", content: "Generate the lesson." }]).map(
          (message) => ({ role: message.role, content: message.content })
        ),
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error?.message ?? "Anthropic request failed");
    const text = data?.content
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("\n")
      .trim();
    return {
      text: text || "No response returned.",
      truncated: data?.stop_reason === "max_tokens",
      finishReason: data?.stop_reason ?? null,
    };
  }

  if (provider === "bedrock") {
    const region = input.bedrockRegion?.trim() || "us-east-1";
    if (!input.bedrockSecretAccessKey) throw new Error("AWS Bedrock secret access key is required");
    const messages = input.messages?.length ? input.messages : [{ role: "user" as const, content: "Generate the lesson." }];
    const body = JSON.stringify({
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: input.maxOutputTokens,
      temperature: 0.35,
      system: input.prompt,
      messages: messages.map((message) => ({ role: message.role, content: message.content })),
    });
    const signed = signBedrockRequest({
      method: "POST",
      region,
      model,
      body,
      accessKeyId: input.apiKey,
      secretAccessKey: input.bedrockSecretAccessKey,
      sessionToken: input.bedrockSessionToken,
    });
    const response = await fetch(signed.url, { method: "POST", headers: signed.headers, body });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message ?? data?.error?.message ?? "AWS Bedrock request failed");
    const text = data?.content
      ?.map((part: { text?: string }) => part.text ?? "")
      .join("\n")
      .trim();
    return {
      text: text || "No response returned.",
      truncated: data?.stop_reason === "max_tokens",
      finishReason: data?.stop_reason ?? null,
    };
  }

  const response = await fetch(openAiCompatibleEndpoint(provider), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${input.apiKey}`,
      ...(provider === "openrouter"
        ? { "HTTP-Referer": "http://localhost", "X-Title": "AlgoBench" }
        : {}),
    },
    body: JSON.stringify({
      model,
      temperature: 0.35,
      max_tokens: input.maxOutputTokens,
      messages: [
        { role: "system", content: input.prompt },
        ...(input.messages?.length ? input.messages : [{ role: "user", content: "Generate the lesson." }]),
      ],
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message ?? `${getAiProvider(provider).name} request failed`);
  const choice = data?.choices?.[0];
  return {
    text: choice?.message?.content?.trim() || "No response returned.",
    truncated: choice?.finish_reason === "length",
    finishReason: choice?.finish_reason ?? null,
  };
}
