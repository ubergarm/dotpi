import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Defaults ─────────────────────────────────────────────────────────────────

const DEFAULT_PRICING = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
};

interface GenerationSettings {
  temperature: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
  presencePenalty: number;
}

const DEFAULT_GENERATION_SETTINGS: GenerationSettings = {
  temperature: 0.7,
  topP: 0.95,
  topK: 40,
  repeatPenalty: 1.0,
  presencePenalty: 0.0,
};

interface LevelBudgets {
  off: number;
  minimal: number;
  low: number;
  medium: number;
  high: number;
  xhigh: number;
}

const DEFAULT_LEVEL_BUDGETS: LevelBudgets = {
  off: 0,
  minimal: 1024,
  low: 2048,
  medium: 4096,
  high: 8192,
  xhigh: 16384,
};

interface DefaultsConfig {
  pricing?: typeof DEFAULT_PRICING;
  serverFlags?: Partial<GenerationSettings>;
  levelBudgets?: Partial<LevelBudgets>;
}

function loadDefaults(): {
  pricing: typeof DEFAULT_PRICING;
  generationSettings: GenerationSettings;
  levelBudgets: LevelBudgets;
} {
  try {
    const defaultsPath = join(__dirname, "defaults.json");
    const raw = readFileSync(defaultsPath, "utf-8");
    const parsed = JSON.parse(raw) as DefaultsConfig;
    return {
      pricing: parsed.pricing ?? DEFAULT_PRICING,
      generationSettings: { ...DEFAULT_GENERATION_SETTINGS, ...parsed.serverFlags },
      levelBudgets: { ...DEFAULT_LEVEL_BUDGETS, ...parsed.levelBudgets },
    };
  } catch {
    return {
      pricing: DEFAULT_PRICING,
      generationSettings: DEFAULT_GENERATION_SETTINGS,
      levelBudgets: DEFAULT_LEVEL_BUDGETS,
    };
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
  // Try the OpenAI-compat path first, then fall back to the full /props root
  const urls = [
    `${baseUrl}/props`,                         // /v1/props (OpenAI-compat, may be trimmed)
    baseUrl.replace(/\/v1\/?$/, "") + "/props", // /props (full endpoint with all fields)
  ];

  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 2_000);
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!response.ok) continue;
      const data = (await response.json()) as ServerProps;
      // If this response has the fields we need, return it
      if (data.default_generation_settings || data.model_info) {
        return data;
      }
      // Otherwise keep trying — later endpoints may have richer data
    } catch {
      // continue to next URL
    }
  }
  return {};
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
function buildBodyOverrides(
  settings: GenerationSettings,
  level: string,
  levelBudgets: LevelBudgets,
): Record<string, number> {
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

  const budget = levelBudgets[level as keyof LevelBudgets];
  if (budget !== undefined) {
    overrides.thinking_budget_tokens = budget;
  }

  return overrides;
}

// ── Extension factory ────────────────────────────────────────────────────────

export default async function (pi: ExtensionAPI) {
  const { pricing: defaultPricing, generationSettings, levelBudgets } = loadDefaults();
  let thinkingEnabled = true;

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
  const aliveEndpoints = new Map<string, { serverDefaults: Record<string, number> | null; reasoning: boolean; vision: boolean }>();

  for (const { name, baseUrl, models, serverDefaults, reasoningSupported, props } of results) {
    if (models.length > 0) {
      aliveEndpoints.set(baseUrl, {
        serverDefaults,
        reasoning: reasoningSupported,
        vision: supportsVision(props),
      });
    }

    pi.registerProvider(name, {
      baseUrl,
      apiKey: "NOT_NEEDED",
      authHeader: false,
      api: "openai-completions",
      models,
    });
  }

  // ── turn_start: refresh status before each turn ───────────────────────
  // Catches Shift+Tab thinking-level changes that happened while idle,
  // refreshing the footer just before the next LLM call.

  pi.on("turn_start", (_event, ctx) => {
    if (isLocalLlama(ctx)) {
      updateStatus(ctx);
    }
  });

  // ── before_provider_request: inject generation params ──────────────────

  pi.on("before_provider_request", (event, ctx) => {
    if (!isLocalLlama(ctx)) return;

    const payload = event.payload as Record<string, unknown>;
    const thinkingLevel = pi.getThinkingLevel();
    const overrides = buildBodyOverrides(generationSettings, thinkingLevel, levelBudgets);

    const chatTemplateKwargs = (payload.chat_template_kwargs as Record<string, unknown> | undefined) ?? {};

    return {
      ...payload,
      ...overrides,
      chat_template_kwargs: {
        ...chatTemplateKwargs,
        enable_thinking: thinkingEnabled,
        clear_thinking: false,
        preserve_thinking: true,
      },
    };
  });

  // ── Status display ─────────────────────────────────────────────────────

  function updateStatus(ctx: { ui: { setStatus: (id: string, text?: string) => void; theme: { fg: (color: string, text: string) => string } } }) {
    if (aliveEndpoints.size === 0) {
      ctx.ui.setStatus("local-llama", undefined);
      ctx.ui.setStatus("thinking", undefined);
      return;
    }

    const parts: string[] = [];
    for (const [baseUrl, info] of aliveEndpoints) {
      const port = baseUrl.split(":")[2]?.split("/")[0] ?? "?";
      const reasoningLabel = info.reasoning ? "🧠" : "💤";
      const visionLabel = info.vision ? "🖼️" : "";
      const labels = `${reasoningLabel}${visionLabel ? ` ${visionLabel}` : ""}`;
      parts.push(`local:${port} ${labels}.`);
    }
    ctx.ui.setStatus("local-llama", parts.join(" "));

    // Thinking status
    if (thinkingEnabled) {
      const thinkingLevel = pi.getThinkingLevel();
      const budget = levelBudgets[thinkingLevel as keyof LevelBudgets] ?? 0;
      ctx.ui.setStatus(
        "thinking",
        ctx.ui.theme.fg("accent", `thinking ✅ effort: ${thinkingLevel} (${budget})`)
      );
    } else {
      ctx.ui.setStatus("thinking", ctx.ui.theme.fg("dim", "no-think 🚫"));
    }
  }

  pi.on("session_start", async (_event, ctx) => {
    // Restore thinking state from session
    const entries = ctx.sessionManager.getEntries();
    const stateEntry = entries
      .filter((e) => e.type === "custom" && e.customType === "thinking-toggle")
      .pop() as { data?: { enabled?: boolean } } | undefined;

    if (stateEntry?.data && typeof stateEntry.data.enabled === "boolean") {
      thinkingEnabled = stateEntry.data.enabled;
    }

    updateStatus(ctx);
  });

  // ── Command: toggle thinking ──────────────────────────────────────────

  pi.registerCommand("thinking", {
    description: "Toggle thinking mode for local-llama models",
    handler: async (args, ctx) => {
      const arg = args?.trim().toLowerCase();
      if (arg === "on") {
        thinkingEnabled = true;
      } else if (arg === "off") {
        thinkingEnabled = false;
      } else {
        thinkingEnabled = !thinkingEnabled;
      }

      updateStatus(ctx);
      ctx.ui.notify(
        `Thinking ${thinkingEnabled ? "enabled" : "disabled"}`,
        "info"
      );

      // Persist state
      pi.appendEntry("thinking-toggle", { enabled: thinkingEnabled });
    },
  });

  // ── Shortcut: toggle thinking ───────────────────────────────────────────

  pi.registerShortcut("ctrl+shift+t", {
    description: "Toggle thinking mode",
    handler: async (ctx) => {
      thinkingEnabled = !thinkingEnabled;
      updateStatus(ctx);
      ctx.ui.notify(
        `Thinking ${thinkingEnabled ? "enabled" : "disabled"}`,
        "info"
      );
      pi.appendEntry("thinking-toggle", { enabled: thinkingEnabled });
    },
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

      const thinkingLevel = pi.getThinkingLevel();
      const budget = levelBudgets[thinkingLevel as keyof LevelBudgets] ?? 0;
      lines.push(`Current thinking level: ${thinkingLevel} (${budget} tokens)`);
      lines.push("");
      lines.push("Level-to-budget mapping (from defaults.json):");
      for (const [level, value] of Object.entries(levelBudgets)) {
        const marker = level === thinkingLevel ? " ← current" : "";
        lines.push(`  ${level}: ${value}${marker}`);
      }
      lines.push("");
      lines.push("Edit .pi/extensions/local-llama/defaults.json to change values.");
      lines.push("Press Esc to close.");

      ctx.ui.setWidget("llama-params", lines);
    },
  });
}
