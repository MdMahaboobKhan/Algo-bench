import { SettingsForm } from "@/components/SettingsForm";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-3xl py-10">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400 dark:text-zinc-500">
          Settings
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">API keys and preferences</h1>
        <p className="mt-3 text-zinc-600 dark:text-zinc-300">
          Add API credentials for Gemini, Claude, OpenAI, Bedrock, or another supported provider for AI-assisted study.
        </p>
      </div>
      <SettingsForm />
    </div>
  );
}
