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
  // - clear_thinking: false  → GLM-5.1 Preserved Thinking (see below)
  // - preserve_thinking: NOT set (commented out, see below)
  //
  // ——————————————————————————————————————————————————————————————————
  // Qwen3.6 — `preserve_thinking` (chat_template.jinja from Qwen/Qwen3.6-27B)
  //
  //   {%- if (preserve_thinking is defined and preserve_thinking is true) or (loop.index0 > ns.last_query_index) %}
  //       {{- '##assistant\n<thinking>\n' + reasoning_content + '\n</thinking>\n\n' + content }}
  //   {%- else %}
  //       {{- '##assistant\n' + content }}
  //   {%- endif %}
  //
  // Default (undefined): thinking is preserved only for messages after the
  // last user query — i.e. within a multi-step tool-call sequence.
  //
  // `preserve_thinking: true`: ALL previous thinking blocks are serialized
  // into the prompt on every turn.  The llama.cpp server must re-process the
  // entire KV-cache (all prior reasoning tokens) for each new user input,
  // even when there is no tool call.  This adds unnecessary latency and
  // compute.  Leave it commented out.
  //
  // ——————————————————————————————————————————————————————————————————
  // GLM-5.1 — `clear_thinking` (chat_template.jinja from zai-org/GLM-5.1)
  //
  //   {%- if ((clear_thinking is defined and not clear_thinking) or loop.index0 > ns.last_user_index) and reasoning_content is defined -%}
  //       {{ '<think>' + reasoning_content +  '</think>'}}
  //   {%- else -%}
  //       {{ '</think>' }}
  //   {%- endif -%}
  //
  // Note the inverse semantics: `not clear_thinking` (opposite of Qwen's
  // `preserve_thinking`).
  //
  // Default (undefined): same as Qwen — thinking preserved only after the
  // last user query.
  //
  // `clear_thinking: false` → `not false` is true → reasoning_content is
  // always included for every assistant message that has it.  This is the
  // GLM-5.1 "Preserved Thinking" mode documented at
  // https://docs.z.ai/guides/capabilities/thinking-mode:
  //
  //   thinking: { type: "enabled", clear_thinking: False }
  //
  // Unlike Qwen's `preserve_thinking: true`, this is the RECOMMENDED setting
  // for GLM-5.1 multi-turn conversations.  The model expects prior reasoning
  // to be present in the prompt so it can maintain coherent context across
  // turns.  With llama.cpp KV caching, the tokens are cached on first pass
  // and not re-computed on subsequent turns, so there is no unnecessary
  // reprocessing penalty.  Keep `clear_thinking: false` set.
  //
  // `clear_thinking: true` → `not true` is false → all reasoning_content is
  // stripped from the prompt.  Use only if you want the model to forget its
  // own thinking on every turn.
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
        // preserve_thinking: true,
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
