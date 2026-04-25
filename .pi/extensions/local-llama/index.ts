import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const DEFAULT_PRICING = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

function loadDefaultPricing(): typeof DEFAULT_PRICING {
  try {
    const pricingPath = join(__dirname, "..", "..", "agent", "default-pricing.json");
    const raw = readFileSync(pricingPath, "utf-8");
    const parsed = JSON.parse(raw) as { default: typeof DEFAULT_PRICING };
    return parsed.default ?? DEFAULT_PRICING;
  } catch {
    return DEFAULT_PRICING;
  }
}

const ENDPOINTS = [
  { name: "local-llama-8080", baseUrl: "http://localhost:8080/v1" },
  { name: "local-llama-8088", baseUrl: "http://localhost:8088/v1" },
];

async function fetchVisionSupport(
  baseUrl: string,
): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2_000);
    const response = await fetch(`${baseUrl}/props`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) {
      return false;
    }
    const payload = (await response.json()) as {
      modalities?: {
        vision?: boolean;
      };
    };
    return !!payload.modalities?.vision;
  } catch {
    return false;
  }
}

async function fetchModels(
  baseUrl: string,
  defaultPricing: typeof DEFAULT_PRICING,
  supportsVision: boolean,
): Promise<NonNullable<Parameters<ExtensionAPI["registerProvider"]>[1]["models"]>> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2_000);
    const response = await fetch(`${baseUrl}/models`, { signal: controller.signal });
    clearTimeout(timeout);
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
      input: supportsVision ? (["text", "image"] as const) : (["text"] as const),
      cost: defaultPricing,
      contextWindow: model.context_window ?? 160000,
      maxTokens: model.max_tokens ?? 4096,
    }));
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      console.warn(`[local-llama] Timeout after 2s fetching models from ${baseUrl}`);
    } else if (err instanceof Error) {
      console.warn(`[local-llama] Endpoint down at ${baseUrl}: ${err.message}`);
    }
    return [];
  }
}

export default async function (pi: ExtensionAPI) {
  const defaultPricing = loadDefaultPricing();

  // Fetch models and vision support from all endpoints in parallel
  const results = await Promise.all(
    ENDPOINTS.map(async ({ name, baseUrl }) => ({
      name,
      baseUrl,
      models: await fetchModels(baseUrl, defaultPricing, await fetchVisionSupport(baseUrl)),
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
