import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const BASE_URL = "http://localhost:8080/v1";

export default async function (pi: ExtensionAPI) {
  let models;
  try {
    const response = await fetch(`${BASE_URL}/models`);
    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }
    const payload = (await response.json()) as {
      data: Array<{
        id: string;
        name?: string;
        context_window?: number;
        max_tokens?: number;
      }>;
    };
    models = payload.data.map((model) => ({
      id: model.id,
      name: model.name ?? model.id,
      reasoning: false,
      input: ["text"],
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: model.context_window ?? 128000,
      maxTokens: model.max_tokens ?? 4096,
    }));
  } catch {
    models = [];
  }

  pi.registerProvider("local-llama", {
    baseUrl: BASE_URL,
    apiKey: "NOT_NEEDED",
    authHeader: false,
    api: "openai-completions",
    models,
  });
}
