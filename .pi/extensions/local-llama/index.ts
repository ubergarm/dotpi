import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const ENDPOINTS = [
  { name: "local-llama-8080", baseUrl: "http://localhost:8080/v1" },
  { name: "local-llama-8088", baseUrl: "http://localhost:8088/v1" },
];

async function fetchModels(baseUrl: string): Promise<NonNullable<Parameters<ExtensionAPI["registerProvider"]>[1]["models"]>> {
  try {
    const response = await fetch(`${baseUrl}/models`);
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
    return payload.data.map((model) => ({
      id: model.id,
      name: model.name ?? model.id,
      reasoning: false,
      input: ["text"] as const,
      cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
      contextWindow: model.context_window ?? 128000,
      maxTokens: model.max_tokens ?? 4096,
    }));
  } catch {
    return [];
  }
}

export default async function (pi: ExtensionAPI) {
  // Fetch models from both endpoints in parallel
  const results = await Promise.all(
    ENDPOINTS.map(async ({ name, baseUrl }) => ({
      name,
      baseUrl,
      models: await fetchModels(baseUrl),
    }))
  );

  for (const { name, baseUrl, models } of results) {
    pi.registerProvider(name, {
      baseUrl,
      apiKey: "NOT_NEEDED",
      authHeader: false,
      api: "openai-completions",
      models,
    });
  }
}
