# pi — Local LLM Config

A [pi.dev](https://pi.dev) config directory with example extensions providing
first-class support for [ik](https://github.com/ikawrakow/ik_llama.cpp)/[llama.cpp](https://github.com/ggml-org/llama.cpp)
`llama-server` local inference.

## What's Here

| Path | What |
|------|------|
| `.pi/settings.json` | Default provider, model, theme |
| `.pi/extensions/local-llama/` | Dynamic model discovery from `localhost:8080` / `localhost:8088`; auto-detects vision & reasoning; injects generation params |
| `.pi/extensions/thinking-toggle.ts` | Toggle thinking mode via `/thinking` or `Ctrl+Shift+T` |
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

## Docs

Upstream docs: `node_modules/@mariozechner/pi-coding-agent/docs/`
Agent dispatch file: [`AGENTS.md`](AGENTS.md)
