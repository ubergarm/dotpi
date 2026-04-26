/**
 * Thinking Toggle Extension
 *
 * Dynamically toggle thinking mode for llama.cpp server models
 * (e.g. Qwen3) via chat_template_kwargs.enable_thinking.
 *
 * Usage:
 *   /thinking         - toggle thinking on/off
 *   /thinking on      - enable thinking
 *   /thinking off     - disable thinking
 *   Ctrl+Shift+T      - keyboard shortcut to toggle
 *
 * The extension injects `chat_template_kwargs: { enable_thinking, clear_thinking, preserve_thinking }`
 * into provider requests for local-llama endpoints.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  let thinkingEnabled = true;

  function isLocalLlama(ctx: { model?: { provider?: string } }): boolean {
    return ctx.model?.provider?.startsWith("local-llama") ?? false;
  }

  function updateStatus(ctx: { ui: { setStatus: (id: string, text?: string) => void; theme: { fg: (color: string, text: string) => string } } }) {
    if (thinkingEnabled) {
      ctx.ui.setStatus("thinking", ctx.ui.theme.fg("accent", "thinking ✅"));
    } else {
      ctx.ui.setStatus("thinking", ctx.ui.theme.fg("dim", "no-think 🚫"));
    }
  }

  // Toggle command
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

  // Keyboard shortcut
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

  // Inject chat_template_kwargs into local-llama provider requests
  //
  // - enable_thinking: toggle thinking on/off (controlled by /thinking command)
  // - clear_thinking → GLM-5.1
  // - preserve_thinking: → Qwen3.6-27B
  pi.on("before_provider_request", (event, ctx) => {
    if (!isLocalLlama(ctx)) return;

    const payload = event.payload as Record<string, unknown>;
    const chatTemplateKwargs = (payload.chat_template_kwargs as Record<string, unknown> | undefined) ?? {};

    return {
      ...payload,
      chat_template_kwargs: {
        ...chatTemplateKwargs,
        enable_thinking: thinkingEnabled,
        clear_thinking: false,
        preserve_thinking: true,
      },
    };
  });

  // Restore state from session on startup
  pi.on("session_start", async (_event, ctx) => {
    const entries = ctx.sessionManager.getEntries();
    const stateEntry = entries
      .filter(
        (e) => e.type === "custom" && e.customType === "thinking-toggle"
      )
      .pop() as { data?: { enabled?: boolean } } | undefined;

    if (stateEntry?.data && typeof stateEntry.data.enabled === "boolean") {
      thinkingEnabled = stateEntry.data.enabled;
    }

    updateStatus(ctx);
  });
}
