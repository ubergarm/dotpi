/**
 * Undo Extension
 *
 * Provides an `/undo` command that rolls back to the most recent user
 * message on the current branch, placing its text in the editor for
 * re-submission. Unlike `/tree`, this requires no selection — it
 * automatically picks the last user node and navigates without
 * summarization.
 *
 * Usage:
 *   /undo    - Roll back to the most recent user message
 */

import type { ExtensionAPI, SessionEntry } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  /**
   * Walk the branch from root to leaf and return the most recent user
   * message entry whose id is NOT the current leaf.
   */
  function findLastUserEntry(
    branch: SessionEntry[],
    leafId: string | null,
  ): SessionEntry | undefined {
    let lastUser: SessionEntry | undefined;
    for (const entry of branch) {
      if (
        entry.type === "message" &&
        entry.message?.role === "user" &&
        entry.id !== leafId
      ) {
        lastUser = entry;
      }
    }
    return lastUser;
  }

  pi.registerCommand("undo", {
    description: "Roll back to the most recent user message",
    handler: async (_args, ctx) => {
      const leafId = ctx.sessionManager.getLeafId();

      // Nothing to undo — session is empty or we are at the root
      if (!leafId) {
        ctx.ui.notify("Nothing to undo", "info");
        return;
      }

      const branch = ctx.sessionManager.getBranch();
      const lastUser = findLastUserEntry(branch, leafId);

      if (!lastUser) {
        ctx.ui.notify("No user message to undo to", "info");
        return;
      }

      // Navigate to the user message without summarization.
      // navigateTree handles the selection logic internally:
      //   - leaf is set to the parent of the user message
      //   - editorText is populated with the message text
      await ctx.navigateTree(lastUser.id, {
        summarize: false,
      });

      ctx.ui.notify("Undone — edit your message and press Enter", "info");
    },
  });
}
