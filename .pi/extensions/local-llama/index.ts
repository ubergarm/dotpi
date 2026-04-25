import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Pricing ──────────────────────────────────────────────────────────────────

const DEFAULT_PRICING = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

function loadDefaultPricing(): typeof DEFAULT_PRICING {
  try {
    const pricingPath = join(__dirname, "default-pricing.json");
    const raw = readFileSync(pricingPath, "utf-8");
    const parsed = JSON.parse(raw) as { default: typeof DEFAULT_PRICING };
    return parsed.default ?? DEFAULT_PRICING;
  } catch {
    return DEFAULT_PRICING;
  }
}

// ── Generation settings ──────────────────────────────────────────────────────

interface GenerationSettings {
  reasoningBudget: number;
  temperature: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
  presencePenalty: number;
}

const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  reasoningBudget: 8192,
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  repeatPenalty: 1.0,
  presencePenalty: 0.0,
};

function loadGenerationSettings(): GenerationSettings {
  try {
    const configPath = join(__dirname, "default-settings.json");
    const raw = readFileSync(configPath, "utf-8");
    const parsed = JSON.parse(raw) as { serverFlags?: Partial<GenerationSettings> };
    return { ...DEFAULT_GENERATION_SETTINGS, ...parsed.serverFlags };
  } catch {
    return DEFAULT_GENERATION_SETTINGS;
  }
}

// ── Endpoints ────────────────────────────────────────────────────────────────

const ENDPOINTS = [
  { name: "local-llama-8080", baseUrl: "http://localhost:8080/v1" },
  { name: "local-llama-8088", baseUrl: "http://localhost:8088/v1" },
];

// ── Props fetching ──────────────────────────────────────────────────────────

interface ServerProps {
  modalities?: { vision?: boolean };
  default_generation_settings?: Record<string, unknown>;
  model_info?: {
    gguf?: Record<string, unknown>;
  };
}

async function fetchProps(baseUrl: string): Promise<ServerProps> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2_000);
    const response = await fetch(`${baseUrl}/props`, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return {};
    return (await response.json()) as ServerProps;
  } catch {
    return {};
  }
}

function supportsVision(props: ServerProps): boolean {
  return !!props.modalities?.vision;
}

/**
 * Detect whether the server model supports reasoning (thinking tags).
 *
 * llama.cpp exposes this via the model's grammar or through the
 * chat-template kwargs. If the server reports `default_generation_settings`
 * we check for thinking-related fields. As a fallback, if the model info
 * contains thinking-related gguf metadata we also enable it.
 */
function supportsReasoning(props: ServerProps): boolean {
  const genSettings = props.default_generation_settings;
  if (genSettings) {
    // Server has generation settings exposed — check for thinking fields
    const keys = Object.keys(genSettings);
    if (keys.some((k) => k.includes("thinking") || k.includes("reasoning"))) {
      return true;
    }
  }

  // Check GGUF model info for thinking-related metadata
  const gguf = props.model_info?.gguf;
  if (gguf) {
    const values = Object.values(gguf).join(" ").toLowerCase();
    if (values.includes("thinking") || values.includes("reasoning")) {
      return true;
    }
  }

  return false;
}

/**
 * Extract server-side default generation settings from /props.
 * Returns null if the server doesn't expose them.
 */
function extractServerDefaults(props: ServerProps): Record<string, number> | null {
  const genSettings = props.default_generation_settings;
  if (!genSettings) return null;

  const knownFields = [
    "temperature",
    "top_p",
    "top_k",
    "repeat_penalty",
    "presence_penalty",
    "thinking_budget_tokens",
  ];

  const result: Record<string, number> = {};
  for (const field of knownFields) {
    const value = genSettings[field];
    if (typeof value === "number") {
      result[field] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

// ── Model fetching ───────────────────────────────────────────────────────────

async function fetchModels(
  baseUrl: string,
  defaultPricing: typeof DEFAULT_PRICING,
  supportsVisionFlag: boolean,
  reasoningSupported: boolean,
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
      reasoning: reasoningSupported,
      input: supportsVisionFlag ? (["text", "image"] as const) : (["text"] as const),
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

// ── Helpers ──────────────────────────────────────────────────────────────────

function isLocalLlama(ctx: { model?: { provider?: string } }): boolean {
  return ctx.model?.provider?.startsWith("local-llama") ?? false;
}

/**
 * Build the llama.cpp-specific body overrides from generation settings.
 *
 * Maps camelCase config keys to the snake_case field names llama-server
 * expects in the OpenAI-compat API body.
 */
function buildBodyOverrides(settings: GenerationSettings): Record<string, number> {
  const overrides: Record<string, number> = {};

  // Only send temperature if it differs from the OpenAI default (1.0)
  // This avoids overriding what pi itself sets for temperature
  if (settings.temperature !== 1.0) {
    overrides.temperature = settings.temperature;
  }

  overrides.top_p = settings.topP;
  overrides.top_k = settings.topK;
  overrides.repeat_penalty = settings.repeatPenalty;
  overrides.presence_penalty = settings.presencePenalty;
  overrides.thinking_budget_tokens = settings.reasoningBudget;

  return overrides;
}

// ── Extension factory ────────────────────────────────────────────────────────

export default async function (pi: ExtensionAPI) {
  const defaultPricing = loadDefaultPricing();
  const generationSettings = loadGenerationSettings();

  // Fetch props and models from all endpoints in parallel
  const results = await Promise.all(
    ENDPOINTS.map(async ({ name, baseUrl }) => {
      const props = await fetchProps(baseUrl);
      const visionSupported = supportsVision(props);
      const reasoningSupported = supportsReasoning(props);
      const serverDefaults = extractServerDefaults(props);
      return {
        name,
        baseUrl,
        props,
        models: await fetchModels(baseUrl, defaultPricing, visionSupported, reasoningSupported),
        serverDefaults,
        reasoningSupported,
      };
    }),
  );

  // Track which endpoints are alive for status display
  const aliveEndpoints = new Map<string, { serverDefaults: Record<string, number> | null; reasoning: boolean }>();

  for (const { name, baseUrl, models, serverDefaults, reasoningSupported } of results) {
    if (models.length > 0) {
      aliveEndpoints.set(baseUrl, { serverDefaults, reasoning: reasoningSupported });
    }

    pi.registerProvider(name, {
      baseUrl,
      apiKey: "NOT_NEEDED",
      authHeader: false,
      api: "openai-completions",
      models,
    });
  }

  // ── before_provider_request: inject generation params ──────────────────

  pi.on("before_provider_request", (event, ctx) => {
    if (!isLocalLlama(ctx)) return;

    const payload = event.payload as Record<string, unknown>;
    const body = (payload.body as Record<string, unknown> | undefined) ?? {};
    const overrides = buildBodyOverrides(generationSettings);

    return {
      ...payload,
      body: {
        ...body,
        ...overrides,
      },
    };
  });

  // ── Status display ─────────────────────────────────────────────────────

  function updateStatus(ctx: { ui: { setStatus: (id: string, text?: string) => void } }) {
    if (aliveEndpoints.size === 0) {
      ctx.ui.setStatus("local-llama", undefined);
      return;
    }

    const parts: string[] = [];
    for (const [baseUrl, info] of aliveEndpoints) {
      const port = baseUrl.split(":")[2]?.split("/")[0] ?? "?";
      const reasoningLabel = info.reasoning ? "🧠" : "💤";
      parts.push(`local:${port} ${reasoningLabel}`);
    }
    ctx.ui.setStatus("local-llama", parts.join(" "));
  }

  pi.on("session_start", async (_event, ctx) => {
    updateStatus(ctx);
  });

  // ── Command: show server defaults ──────────────────────────────────────

  pi.registerCommand("llama-params", {
    description: "Show local-llama server defaults and current overrides",
    handler: async (_args, ctx) => {
      const lines: string[] = [];
      lines.push("Local Llama Configuration");
      lines.push("");

      if (aliveEndpoints.size === 0) {
        lines.push("No local-llama endpoints are currently available.");
        lines.push("Start llama-server and try again.");
        ctx.ui.setWidget("llama-params", lines);
        return;
      }

      for (const [baseUrl, info] of aliveEndpoints) {
        const port = baseUrl.split(":")[2]?.split("/")[0] ?? "?";
        lines.push(`Endpoint: localhost:${port}`);
        lines.push(`  Reasoning: ${info.reasoning ? "supported" : "not detected"}`);

        if (info.serverDefaults) {
          lines.push("  Server defaults:");
          for (const [key, value] of Object.entries(info.serverDefaults)) {
            lines.push(`    ${key}: ${value}`);
          }
        } else {
          lines.push("  Server defaults: not exposed by /props");
        }
        lines.push("");
      }

      lines.push("Current request overrides (from default-settings.json):");
      const overrides = buildBodyOverrides(generationSettings);
      for (const [key, value] of Object.entries(overrides)) {
        lines.push(`  ${key}: ${value}`);
      }
      lines.push("");
      lines.push("Edit .pi/extensions/local-llama/default-settings.json to change values.");
      lines.push("Press Esc to close.");

      ctx.ui.setWidget("llama-params", lines);
    },
  });
}
