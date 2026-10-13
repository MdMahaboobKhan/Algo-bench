"use client";

import { useEffect, useState } from "react";
import {
  AI_ENABLED_STORAGE_KEY,
  AI_PROVIDERS,
  AI_PROVIDER_STORAGE_KEY,
  getAiProvider,
  type AiProviderId,
} from "@/lib/ai-providers";

const BEDROCK_REGION_KEY = "algobench:bedrock-region";
const BEDROCK_SECRET_KEY = "algobench:bedrock-secret-access-key";
const BEDROCK_SESSION_TOKEN_KEY = "algobench:bedrock-session-token";

function maskKey(value: string): string {
  if (!value) return "No key saved";
  if (value.length <= 8) return "••••••••";
  return `${value.slice(0, 4)}••••••••${value.slice(-4)}`;
}

export function SettingsForm() {
  const [providerId, setProviderId] = useState<AiProviderId>("gemini");
  const [draftKeys, setDraftKeys] = useState<Record<string, string>>({});
  const [savedKeys, setSavedKeys] = useState<Record<string, string>>({});
  const [models, setModels] = useState<Record<string, string>>({});
  const [enabled, setEnabled] = useState(true);
  const [bedrockRegion, setBedrockRegion] = useState("us-east-1");
  const [bedrockSecret, setBedrockSecret] = useState("");
  const [savedBedrockSecret, setSavedBedrockSecret] = useState("");
  const [bedrockSessionToken, setBedrockSessionToken] = useState("");
  const [savedBedrockSessionToken, setSavedBedrockSessionToken] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const activeProvider = getAiProvider(providerId);
  const selectedModel = activeProvider.models.includes(models[providerId] ?? "")
    ? models[providerId]
    : activeProvider.defaultModel;

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      const storedProvider = getAiProvider(window.localStorage.getItem(AI_PROVIDER_STORAGE_KEY));
      const storedEnabled = window.localStorage.getItem(AI_ENABLED_STORAGE_KEY);
      const keys: Record<string, string> = {};
      const modelMap: Record<string, string> = {};
      for (const provider of AI_PROVIDERS) {
        keys[provider.id] = window.localStorage.getItem(provider.keyStorageKey) ?? "";
        modelMap[provider.id] = window.localStorage.getItem(provider.modelStorageKey) ?? provider.defaultModel;
      }

      // Backward compatibility with the first Gemini-only settings keys.
      if (!keys.gemini) keys.gemini = window.localStorage.getItem("algobench:gemini-api-key") ?? "";
      if (!modelMap.gemini) modelMap.gemini = window.localStorage.getItem("algobench:gemini-model") ?? "gemini-2.5-flash";

      setProviderId(storedProvider.id);
      setSavedKeys(keys);
      setModels(modelMap);
      setEnabled(storedEnabled ? storedEnabled === "true" : true);
      setBedrockRegion(window.localStorage.getItem(BEDROCK_REGION_KEY) ?? "us-east-1");
      setSavedBedrockSecret(window.localStorage.getItem(BEDROCK_SECRET_KEY) ?? "");
      setSavedBedrockSessionToken(window.localStorage.getItem(BEDROCK_SESSION_TOKEN_KEY) ?? "");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  function save() {
    const nextKeys = { ...savedKeys };
    for (const provider of AI_PROVIDERS) {
      const draft = draftKeys[provider.id]?.trim();
      if (draft) {
        window.localStorage.setItem(provider.keyStorageKey, draft);
        nextKeys[provider.id] = draft;
      }
      const selected = models[provider.id]?.trim() || provider.defaultModel;
      window.localStorage.setItem(
        provider.modelStorageKey,
        provider.models.includes(selected) ? selected : provider.defaultModel
      );
    }
    window.localStorage.setItem(AI_PROVIDER_STORAGE_KEY, providerId);
    window.localStorage.setItem(AI_ENABLED_STORAGE_KEY, String(enabled));
    window.localStorage.setItem(BEDROCK_REGION_KEY, bedrockRegion.trim() || "us-east-1");
    if (bedrockSecret.trim()) {
      window.localStorage.setItem(BEDROCK_SECRET_KEY, bedrockSecret.trim());
      setSavedBedrockSecret(bedrockSecret.trim());
      setBedrockSecret("");
    }
    if (bedrockSessionToken.trim()) {
      window.localStorage.setItem(BEDROCK_SESSION_TOKEN_KEY, bedrockSessionToken.trim());
      setSavedBedrockSessionToken(bedrockSessionToken.trim());
      setBedrockSessionToken("");
    }
    setSavedKeys(nextKeys);
    setDraftKeys({});
    setMessage("AI provider settings saved locally in this browser.");
  }

  function clearProviderKey(id: AiProviderId) {
    const provider = getAiProvider(id);
    window.localStorage.removeItem(provider.keyStorageKey);
    setSavedKeys((prev) => ({ ...prev, [id]: "" }));
    setDraftKeys((prev) => ({ ...prev, [id]: "" }));
    setMessage(`${provider.name} key removed from this browser.`);
  }

  function clearBedrockSecret() {
    window.localStorage.removeItem(BEDROCK_SECRET_KEY);
    window.localStorage.removeItem(BEDROCK_SESSION_TOKEN_KEY);
    setSavedBedrockSecret("");
    setSavedBedrockSessionToken("");
    setBedrockSecret("");
    setBedrockSessionToken("");
    setMessage("AWS Bedrock secret/session credentials removed from this browser.");
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="font-semibold">AI provider</h2>
            <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
              API keys are stored only in browser localStorage. A normal ChatGPT/Claude web subscription is not an API credential; use provider API keys here.
            </p>
          </div>
          <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
            Active: {activeProvider.name}
          </span>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-[16rem_1fr]">
          <div className="space-y-2">
            {AI_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                onClick={() => setProviderId(provider.id)}
                className={`w-full rounded-xl border px-3 py-2 text-left text-sm ${
                  providerId === provider.id
                    ? "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900"
                    : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:bg-zinc-800"
                }`}
              >
                <div className="font-medium">{provider.name}</div>
                <div className="text-xs opacity-75">{maskKey(savedKeys[provider.id] ?? "")}</div>
              </button>
            ))}
          </div>

          <div className="rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">{activeProvider.name}</h3>
                <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
                  Saved key: {maskKey(savedKeys[providerId] ?? "")}
                </p>
              </div>
              <button
                onClick={() => clearProviderKey(providerId)}
                className="text-xs text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400"
              >
                Clear key
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="text-sm font-medium">{providerId === "bedrock" ? "AWS access key ID" : "API key"}</span>
                <input
                  type="password"
                  value={draftKeys[providerId] ?? ""}
                  onChange={(e) => setDraftKeys((prev) => ({ ...prev, [providerId]: e.target.value }))}
                  placeholder={savedKeys[providerId] ? "Paste a new key to replace the saved one" : activeProvider.placeholder}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-600"
                />
              </label>

              {providerId === "bedrock" && (
                <div className="space-y-4 rounded-xl border border-zinc-200 p-3 dark:border-zinc-800">
                  <label className="block">
                    <span className="text-sm font-medium">AWS region</span>
                    <input
                      type="text"
                      value={bedrockRegion}
                      onChange={(e) => setBedrockRegion(e.target.value)}
                      placeholder="us-east-1"
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-600"
                    />
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">AWS secret access key</span>
                    <input
                      type="password"
                      value={bedrockSecret}
                      onChange={(e) => setBedrockSecret(e.target.value)}
                      placeholder={savedBedrockSecret ? "Paste a new secret to replace saved one" : "Paste your AWS secret access key"}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-600"
                    />
                    <span className="mt-1 block text-xs text-zinc-400 dark:text-zinc-500">
                      Saved secret: {maskKey(savedBedrockSecret)}
                    </span>
                  </label>
                  <label className="block">
                    <span className="text-sm font-medium">AWS session token optional</span>
                    <input
                      type="password"
                      value={bedrockSessionToken}
                      onChange={(e) => setBedrockSessionToken(e.target.value)}
                      placeholder={savedBedrockSessionToken ? "Paste a new session token to replace saved one" : "Only needed for temporary STS credentials"}
                      className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-600"
                    />
                    <span className="mt-1 block text-xs text-zinc-400 dark:text-zinc-500">
                      Saved token: {maskKey(savedBedrockSessionToken)}
                    </span>
                  </label>
                  <button
                    onClick={clearBedrockSecret}
                    className="text-xs text-zinc-400 hover:text-red-600 dark:text-zinc-500 dark:hover:text-red-400"
                  >
                    Clear Bedrock secret/session token
                  </button>
                </div>
              )}

              <label className="block">
                <span className="text-sm font-medium">Model</span>
                <select
                  value={selectedModel}
                  onChange={(e) => setModels((prev) => ({ ...prev, [providerId]: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-950 dark:focus:ring-zinc-600"
                >
                  {activeProvider.models.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-zinc-400 dark:text-zinc-500">
                  Dropdown lists text/chat-capable models for this app. Gemini also includes Gemma 4 models hosted on the Gemini API.
                </span>
              </label>

              <label className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300"
                />
                Enable AI-assisted study features when available
              </label>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            onClick={save}
            className="rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Save AI settings
          </button>
        </div>
        {message && <p className="mt-3 text-sm text-emerald-600 dark:text-emerald-400">{message}</p>}
      </section>

      <section className="rounded-2xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="font-semibold">Supported connections</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[
            "Gemini via Google AI Studio API key",
            "Claude via Anthropic API key",
            "OpenAI via OpenAI API key (not ChatGPT Plus subscription login)",
            "OpenRouter, Groq, Mistral, DeepSeek, and xAI via API keys",
            "AWS Bedrock via AWS access key ID, secret access key, region, and optional session token",
          ].map((item) => (
            <div key={item} className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600 dark:bg-zinc-950 dark:text-zinc-300">
              {item}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
