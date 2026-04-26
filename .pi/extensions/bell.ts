/**
 * Bell Extension
 *
 * Plays a bell sound via PipeWire when the agent finishes its turn
 * and control returns to the user.
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const BELL_WAV = "/app/pi/assets/bell.wav";

export default function (pi: ExtensionAPI) {
  pi.on("agent_end", async (_event, _ctx) => {
    try {
      await pi.exec("pw-play", [BELL_WAV], { timeout: 5000 });
    } catch {
      // Silently ignore audio errors so pi never breaks when
      // PipeWire is unavailable or the socket isn't mounted.
    }
  });
}
