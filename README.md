# pi — Terminal Coding Agent

[pi](https://pi.dev) is a minimal, aggressively extensible terminal coding harness. This directory contains a self-contained installation configured for **local LLM inference** via llama.cpp — no cloud API keys needed.

## Quick Start

```bash
# Install dependencies
cd pi
npm install

# Start pi (requires a llama.cpp server on port 8080 or 8088)
./pi.sh
```

Models are discovered automatically from any running llama.cpp instance. The default config targets `Qwen3.6-27B` on `localhost:8080`.

## Installation

```bash
# Fresh install
cd pi
npm install @mariozechner/pi-coding-agent

# Update to latest
npm install @mariozechner/pi-coding-agent
```

Everything stays in `./node_modules/` — no global installs, no system dependencies beyond Node.js.

## Running

```bash
# Launcher script (sets PI_CODING_AGENT_DIR automatically)
./pi.sh

# Or directly
node node_modules/@mariozechner/pi-coding-agent/dist/cli.js --config-dir .pi
```

## Configuration

All pi configuration lives in the `.pi/` directory:

| File | Purpose |
|------|---------|
| `.pi/settings.json` | Default provider, model, theme, thinking level |
| `.pi/agent/default-pricing.json` | Token pricing for cost tracking |
| `.pi/extensions/` | Custom TypeScript extensions |
| `.pi/skills/` | On-demand capability packages |

### Default Settings

```json
{
  "defaultProvider": "local-llama-8080",
  "defaultModel": "Qwen3.6-27B",
  "defaultThinkingLevel": "medium",
  "theme": "dark",
  "enableInstallTelemetry": false
}
```

## Local LLM Setup

Models are discovered dynamically from llama.cpp servers. The `local-llama` extension polls two endpoints:

- `http://localhost:8080/v1` (provider: `local-llama-8080`)
- `http://localhost:8088/v1` (provider: `local-llama-8088`)

Start llama.cpp with the OpenAI-compatible API:

```bash
llama-server -m /path/to/model.gguf --host 0.0.0.0 --port 8080
```

Pi will auto-discover loaded models on startup.

## Extensions

Two extensions are configured:

1. **local-llama** (`.pi/extensions/local-llama/`) — Dynamically registers GGUF models from llama.cpp endpoints
2. **token-footer** (`.pi/extensions/token-footer.ts`) — Shows actual token counts (`2.9k/160k`) instead of percentage in the footer

## Skills

The **web-search** skill (`.pi/skills/web-search/`) enables DuckDuckGo search and page content extraction. Invoke with `/skill:web-search` in pi.

Setup (one-time):
```bash
cd .pi/skills/web-search
uv venv .venv --relocatable -p 3.13 --python-preference=only-managed
uv sync
```

## Docker

A Dockerfile provides a development container with Node.js, git, ripgrep, fd-find, build-essential, and cmake.

```bash
# Build
./docker-build-image.sh

# Run (mounts current dir + host uv binary)
./docker-run.sh
```

## Tools

Pi provides four default tools that the model uses to interact with your project:

| Tool | Description |
|------|-------------|
| `read` | Read file contents (text and images) |
| `bash` | Execute shell commands |
| `edit` | Precise file text replacement |
| `write` | Create or overwrite files |

## Documentation Strategy (Progressive Disclosure)

This project uses progressive disclosure across its documentation files to keep context windows lean:

1. **`AGENTS.md`** — Minimal dispatch file. Just enough for an agent to orient itself: run command, config path, skill/extension index.
2. **`README.md`** — Full setup, configuration, and usage guide. Read when you need implementation details.
3. **`SKILL.md`** (per skill) — Read only when the agent needs to use that specific skill. Contains usage instructions, CLI commands, and examples.
4. **Extension source** (`index.ts`, `token-footer.ts`) — Read when debugging or modifying extension behavior.
5. **Upstream docs** (`/app/pi-mono/packages/coding-agent/docs/`) — Read for deep dives into APIs, themes, keybindings, etc.

The goal: no repetition, no bloat. An agent reads only what it needs for the task at hand.

## Documentation

Full upstream docs: `/app/pi-mono/packages/coding-agent/docs/`

Key topics:
- `extensions.md` — Building custom extensions
- `skills.md` — Creating skill packages
- `themes.md` — Custom themes
- `keybindings.md` — Keyboard shortcuts
- `settings.md` — All configuration options
- `providers.md` — Provider setup
- `models.md` — Model configuration

## References

- **pi.dev** — https://pi.dev
- **GitHub** — https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent
- **npm** — https://www.npmjs.com/package/@mariozechner/pi-coding-agent
