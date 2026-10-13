export type AiProviderId =
  | "gemini"
  | "openai"
  | "anthropic"
  | "openrouter"
  | "groq"
  | "mistral"
  | "deepseek"
  | "xai"
  | "bedrock";

export interface AiProviderConfig {
  id: AiProviderId;
  name: string;
  defaultModel: string;
  models: string[];
  keyStorageKey: string;
  modelStorageKey: string;
  placeholder: string;
}

export const AI_PROVIDER_STORAGE_KEY = "algobench:ai-provider";
export const AI_ENABLED_STORAGE_KEY = "algobench:ai-enabled";

export const AI_PROVIDERS: AiProviderConfig[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    defaultModel: "gemini-3.8-flash",
    models: [
      "gemini-3.8-flash",
      "gemini-3.6-flash",
      "gemini-3.5-flash-lite",
      "gemini-3.1-pro-preview",
      "gemini-3.1-flash-lite",
      "gemini-3-flash-preview",
      "gemini-2.5-pro",
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemma-4-31b-it",
      "gemma-4-26b-a4b-it",
    ],
    keyStorageKey: "algobench:gemini-api-key",
    modelStorageKey: "algobench:gemini-model",
    placeholder: "Paste your Gemini API key",
  },
  {
    id: "openai",
    name: "OpenAI",
    defaultModel: "gpt-6-astra",
    models: [
      "gpt-6-astra",
      "gpt-5.6-sol",
      "gpt-5.6-terra",
      "gpt-5.6-luna",
      "gpt-5",
      "gpt-5-mini",
      "gpt-5-nano",
      "gpt-4.1",
      "gpt-4.1-mini",
      "gpt-4o",
      "gpt-4o-mini",
      "o3",
      "o4-mini",
    ],
    keyStorageKey: "algobench:openai-api-key",
    modelStorageKey: "algobench:openai-model",
    placeholder: "Paste your OpenAI API key",
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    defaultModel: "claude-sonnet-4-6",
    models: [
      "claude-fable-5",
      "claude-opus-5",
      "claude-sonnet-5",
      "claude-opus-4-6",
      "claude-sonnet-4-6",
      "claude-haiku-4-5",
      "claude-sonnet-4-5",
      "claude-opus-4-5",
    ],
    keyStorageKey: "algobench:anthropic-api-key",
    modelStorageKey: "algobench:anthropic-model",
    placeholder: "Paste your Anthropic API key",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    defaultModel: "openai/gpt-6-astra",
    models: [
      "openai/gpt-6-astra",
      "openai/gpt-5.6-sol",
      "openai/gpt-5.6-terra",
      "openai/gpt-5.6-luna",
      "anthropic/claude-sonnet-4.6",
      "anthropic/claude-opus-4.6",
      "google/gemini-3.8-flash",
      "google/gemini-3.5-flash",
      "meta-llama/llama-3.3-70b-instruct",
    ],
    keyStorageKey: "algobench:openrouter-api-key",
    modelStorageKey: "algobench:openrouter-model",
    placeholder: "Paste your OpenRouter API key",
  },
  {
    id: "groq",
    name: "Groq",
    defaultModel: "llama-3.1-8b-instant",
    models: [
      "llama-3.3-70b-versatile",
      "llama-3.1-8b-instant",
      "openai/gpt-oss-120b",
      "openai/gpt-oss-20b",
      "moonshotai/kimi-k2-instruct",
    ],
    keyStorageKey: "algobench:groq-api-key",
    modelStorageKey: "algobench:groq-model",
    placeholder: "Paste your Groq API key",
  },
  {
    id: "mistral",
    name: "Mistral AI",
    defaultModel: "mistral-small-latest",
    models: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest", "codestral-latest", "open-mistral-nemo"],
    keyStorageKey: "algobench:mistral-api-key",
    modelStorageKey: "algobench:mistral-model",
    placeholder: "Paste your Mistral API key",
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    defaultModel: "deepseek-chat",
    models: ["deepseek-chat", "deepseek-reasoner"],
    keyStorageKey: "algobench:deepseek-api-key",
    modelStorageKey: "algobench:deepseek-model",
    placeholder: "Paste your DeepSeek API key",
  },
  {
    id: "xai",
    name: "xAI Grok",
    defaultModel: "grok-4",
    models: ["grok-4", "grok-3", "grok-3-mini", "grok-2-latest"],
    keyStorageKey: "algobench:xai-api-key",
    modelStorageKey: "algobench:xai-model",
    placeholder: "Paste your xAI API key",
  },
  {
    id: "bedrock",
    name: "AWS Bedrock",
    defaultModel: "anthropic.claude-sonnet-4-6",
    models: [
      "anthropic.claude-sonnet-4-6",
      "anthropic.claude-opus-4-6-v1",
      "anthropic.claude-haiku-4-5-20251001-v1:0",
      "anthropic.claude-sonnet-4-5-20250929-v1:0",
      "anthropic.claude-opus-4-5-20251101-v1:0",
      "amazon.nova-pro-v1:0",
      "amazon.nova-lite-v1:0",
      "meta.llama3-3-70b-instruct-v1:0",
    ],
    keyStorageKey: "algobench:bedrock-access-key-id",
    modelStorageKey: "algobench:bedrock-model",
    placeholder: "Paste your AWS access key ID",
  },
];

export function getAiProvider(id: string | null | undefined): AiProviderConfig {
  return AI_PROVIDERS.find((provider) => provider.id === id) ?? AI_PROVIDERS[0];
}
