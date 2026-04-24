/**
 * Token Footer Extension
 *
 * Overrides the default footer to show actual context token counts
 * instead of percentage. E.g. "2.9k/160k" instead of "1.8%/160k".
 * Keeps all other footer features the same (I/O tokens, cost, git branch, etc.).
 *
 * Enabled by default. Use /token-footer to toggle on/off.
 */

import type { AssistantMessage } from "@mariozechner/pi-ai";
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@mariozechner/pi-tui";

export default function (pi: ExtensionAPI) {
  let enabled = true;

  /** Same formatTokens logic as the default footer. */
  const formatTokens = (count: number): string => {
    if (count < 1_000) return count.toString();
    if (count < 10_000) return `${(count / 1_000).toFixed(1)}k`;
    if (count < 1_000_000) return `${Math.round(count / 1_000)}k`;
    if (count < 10_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
    return `${Math.round(count / 1_000_000)}M`;
  };

  const setCustomFooter = (ctx: import("@mariozechner/pi-coding-agent").ExtensionContext) => {
    ctx.ui.setFooter((tui, theme, footerData) => {
      const unsub = footerData.onBranchChange(() => tui.requestRender());

      return {
        dispose: unsub,
        invalidate() {},
        render(width: number): string[] {
          // --- Compute cumulative usage from session entries ---
          let totalInput = 0;
          let totalOutput = 0;
          let totalCacheRead = 0;
          let totalCacheWrite = 0;
          let totalCost = 0;

          for (const entry of ctx.sessionManager.getEntries()) {
            if (entry.type === "message" && entry.message.role === "assistant") {
              const m = entry.message as AssistantMessage;
              totalInput += m.usage.input;
              totalOutput += m.usage.output;
              totalCacheRead += m.usage.cacheRead;
              totalCacheWrite += m.usage.cacheWrite;
              totalCost += m.usage.cost.total;
            }
          }

          // --- Context usage from ctx.getContextUsage() ---
          const contextUsage = ctx.getContextUsage();
          const contextWindow = contextUsage?.contextWindow ?? (ctx.model?.contextWindow ?? 0);
          const contextTokens = contextUsage?.tokens;
          const contextPercent = contextUsage?.percent ?? 0;

          // --- PWD line ---
          let pwd = ctx.sessionManager.getCwd();
          const home = process.env.HOME || process.env.USERPROFILE;
          if (home && pwd.startsWith(home)) {
            pwd = `~${pwd.slice(home.length)}`;
          }

          const branch = footerData.getGitBranch();
          if (branch) {
            pwd = `${pwd} (${branch})`;
          }

          const sessionName = ctx.sessionManager.getSessionName();
          if (sessionName) {
            pwd = `${pwd} • ${sessionName}`;
          }

          // --- Build stats parts ---
          const statsParts: string[] = [];
          if (totalInput) statsParts.push(`↑${formatTokens(totalInput)}`);
          if (totalOutput) statsParts.push(`↓${formatTokens(totalOutput)}`);
          if (totalCacheRead) statsParts.push(`R${formatTokens(totalCacheRead)}`);
          if (totalCacheWrite) statsParts.push(`W${formatTokens(totalCacheWrite)}`);

          const usingSubscription = ctx.model ? ctx.modelRegistry.isUsingOAuth(ctx.model) : false;
          if (totalCost || usingSubscription) {
            const costStr = `$${totalCost.toFixed(3)}${usingSubscription ? " (sub)" : ""}`;
            statsParts.push(costStr);
          }

          // --- Context display: actual k tokens instead of percentage ---
          const autoIndicator = " (auto)";
          const contextDisplay =
            contextTokens != null
              ? `${formatTokens(contextTokens)}/${formatTokens(contextWindow)}${autoIndicator}`
              : `?/${formatTokens(contextWindow)}${autoIndicator}`;

          // Colorize context based on usage percentage
          let contextPercentStr: string;
          if (contextPercent > 90) {
            contextPercentStr = theme.fg("error", contextDisplay);
          } else if (contextPercent > 70) {
            contextPercentStr = theme.fg("warning", contextDisplay);
          } else {
            contextPercentStr = contextDisplay;
          }
          statsParts.push(contextPercentStr);

          let statsLeft = statsParts.join(" ");

          // --- Right side: model name ---
          const modelName = ctx.model?.id || "no-model";

          let rightSideWithoutProvider = modelName;
          if (ctx.model?.reasoning) {
            const thinkingLevel = pi.getThinkingLevel();
            rightSideWithoutProvider = `${modelName} • ${thinkingLevel}`;
          }

          // Prepend provider in parentheses if multiple providers available
          let rightSide = rightSideWithoutProvider;
          if (footerData.getAvailableProviderCount() > 1 && ctx.model) {
            rightSide = `(${ctx.model.provider}) ${rightSideWithoutProvider}`;
            if (visibleWidth(statsLeft) + 2 + visibleWidth(rightSide) > width) {
              rightSide = rightSideWithoutProvider;
            }
          }

          // --- Assemble stats line ---
          const statsLeftWidth = visibleWidth(statsLeft);
          if (statsLeftWidth > width) {
            statsLeft = truncateToWidth(statsLeft, width, "...");
          }

          const rightSideWidth = visibleWidth(rightSide);
          const totalNeeded = visibleWidth(statsLeft) + 2 + rightSideWidth;

          let statsLine: string;
          if (totalNeeded <= width) {
            const padding = " ".repeat(width - visibleWidth(statsLeft) - rightSideWidth);
            statsLine = statsLeft + padding + rightSide;
          } else {
            const availableForRight = width - visibleWidth(statsLeft) - 2;
            if (availableForRight > 0) {
              const truncatedRight = truncateToWidth(rightSide, availableForRight, "");
              const padding = " ".repeat(Math.max(0, width - visibleWidth(statsLeft) - visibleWidth(truncatedRight)));
              statsLine = statsLeft + padding + truncatedRight;
            } else {
              statsLine = statsLeft;
            }
          }

          // --- Apply dim ---
          const dimStatsLeft = theme.fg("dim", statsLeft);
          const remainder = statsLine.slice(statsLeft.length);
          const dimRemainder = theme.fg("dim", remainder);

          const pwdLine = truncateToWidth(theme.fg("dim", pwd), width, theme.fg("dim", "..."));
          const lines = [pwdLine, dimStatsLeft + dimRemainder];

          // --- Extension statuses ---
          const extensionStatuses = footerData.getExtensionStatuses();
          if (extensionStatuses.size > 0) {
            const sortedStatuses = Array.from(extensionStatuses.entries())
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([, text]) => text.replace(/[\r\n\t]/g, " ").replace(/ +/g, " ").trim());
            const statusLine = sortedStatuses.join(" ");
            lines.push(truncateToWidth(statusLine, width, theme.fg("dim", "...")));
          }

          return lines;
        },
      };
    });
  };

  // Enable on startup
  pi.on("session_start", async (_event, ctx) => {
    setCustomFooter(ctx);
  });

  pi.registerCommand("token-footer", {
    description: "Toggle custom token footer",
    handler: async (_args, ctx) => {
      enabled = !enabled;

      if (enabled) {
        setCustomFooter(ctx);
        ctx.ui.notify("Token footer enabled", "info");
      } else {
        ctx.ui.setFooter(undefined);
        ctx.ui.notify("Default footer restored", "info");
      }
    },
  });
}
