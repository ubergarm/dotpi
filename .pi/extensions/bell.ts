/**
 * Bell Extension
 *
 * Plays 1–5 bell rings via PipeWire when the agent finishes its turn.
 * The number of rings scales with how long the agent worked:
 *   < 1 min  → 1 ring
 *   1–3 min  → 2 rings
 *   3–5 min  → 3 rings
 *   5–15 min → 4 rings
 *   ≥ 15 min → 5 rings (max)
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const BELL_WAV = "/app/pi/assets/bell.wav";
const RING_DELAY_MS = 500;

function bellCount(minutes: number): number {
  if (minutes < 1) return 1;
  if (minutes < 3) return 2;
  if (minutes < 5) return 3;
  if (minutes < 15) return 4;
  return 5;
}

export default function (pi: ExtensionAPI) {
  let agentStartMs: number | undefined;

  pi.on("agent_start", async () => {
    agentStartMs = Date.now();
  });

  pi.on("agent_end", async (event, _ctx) => {
    const lastAssistant = [...event.messages]
      .reverse()
      .find((m) => "role" in m && m.role === "assistant") as
      | { stopReason: "stop" | "length" | "toolUse" | "error" | "aborted" }
      | undefined;

    if (lastAssistant?.stopReason === "aborted") {
      return;
    }

    const minutes = agentStartMs != null ? (Date.now() - agentStartMs) / 60_000 : 0;
    const n = bellCount(minutes);

    for (let i = 0; i < n; i++) {
      try {
        await pi.exec("pw-play", ["--volume", "1.0", BELL_WAV], { timeout: 1000 });
      } catch {
        // Silently ignore audio errors so pi never breaks when
        // PipeWire is unavailable or the socket isn't mounted.
        return; // Stop ringing if one fails
      }
      if (i < n - 1) {
        await new Promise((r) => setTimeout(r, RING_DELAY_MS));
      }
    }
  });
}
