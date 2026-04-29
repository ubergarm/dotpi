# pi — Local LLM Config

A [pi.dev](https://pi.dev) config directory with example extensions providing
first-class support for [ik](https://github.com/ikawrakow/ik_llama.cpp)/[llama.cpp](https://github.com/ggml-org/llama.cpp)
`llama-server` local inference.

## What's Here

| Path | What |
|------|------|
| `.pi/settings.json` | Default provider, model, theme |
| `.pi/extensions/local-llama/` | Dynamic model discovery from `localhost:8080` / `localhost:8088`; auto-detects vision & reasoning; maps pi thinking levels (Shift+Tab) to `thinking_budget_tokens`; thinking toggle via `/thinking` or `Ctrl+Shift+T`; dynamic footer status refresh; session-persistent thinking state |
| `.pi/extensions/token-footer.ts` | Actual token counts in footer instead of percentage |
| `.pi/extensions/undo.ts` | `/undo` — roll back to last user message |
| `.pi/extensions/bell.ts` | Bell sound on agent turn end |
| `.pi/skills/web-search/` | DuckDuckGo search & page extraction |

## Quick Start

```bash
cd pi
npm install
./pi.sh
```

Requires a llama-server on port 8080 or 8088. Models are auto-discovered. Easily reconfigured through vibe coding.

## Sandboxing

Pi's tools can read, write, edit files and execute shell commands. Run it
inside a bind-mounted container, VM, or filesystem sandbox so a runaway
agent can't nuke your machine.

A Docker image is included but optional:

```bash
./docker-build-image.sh
./docker-run.sh
```

## Message Queue

While the agent is working you can still type — messages are queued instead of interrupting:

| Key | Type | When delivered |
|-----|------|----------------|
| **Enter** | *Steering* | Before the agent's next LLM call (mid-work course correction) |
| **Alt+Enter** | *Follow-up* | After the agent finishes all work (stack new tasks) |
| **Alt+Up** | Dequeue | Pull queued messages back into the editor to edit |

**Steering** (Enter) — course corrections and mid-work instructions. The agent picks these up before its next LLM call, so you can redirect it without waiting for it to finish.

**Follow-up** (Alt+Enter) — new tasks queued for after the agent completes. These are held until the agent is fully idle with no pending tool calls or steering messages. Use this to stack up work while the agent is busy.

## Docs

Upstream docs: `node_modules/@mariozechner/pi-coding-agent/docs/`
Agent dispatch file: [`AGENTS.md`](AGENTS.md)
