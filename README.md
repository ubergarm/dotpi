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

Models are discovered automatically from any running llama.cpp instance. The default config targets `ubergarm/Kimi-K2.6-GGUF` on `localhost:8088`.

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
| `.pi/extensions/local-llama/defaults.json` | Token pricing and generation settings (temperature, topP, reasoning budget, etc.) |
| `.pi/extensions/` | Custom TypeScript extensions |
| `.pi/skills/` | On-demand capability packages |
| `.pi/extensions/bell.ts` | Bell extension source (plays sound on `agent_end`) |

### Default Settings

```json
{
  "lastChangelogVersion": "0.70.5",
  "defaultProvider": "local-llama-8088",
  "defaultModel": "ubergarm/Kimi-K2.6-GGUF",
  "enableInstallTelemetry": false,
  "theme": "dark"
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

## Commands

| Command | Description |
|---------|-------------|
| `llama-params` | Show local-llama server defaults and current generation overrides |
| `thinking` | Toggle thinking mode on/off for local-llama models (`/thinking on`/`off`) |
| `token-footer` | Toggle custom token footer (actual token counts vs percentage) |
| `undo` | Roll back to the most recent user message, placing its text in the editor for re-submission |

## Extensions

Extensions:

| Extension | File | Description |
|-----------|------|-------------|
| local-llama | `.pi/extensions/local-llama/` | Dynamic model discovery from `localhost:8080` and `localhost:8088`; auto-detects vision & reasoning support via `/props`; injects generation params; status bar shows endpoint health with 🧠/💤 reasoning indicator |
| thinking-toggle | `.pi/extensions/thinking-toggle.ts` | Toggle thinking mode (`chat_template_kwargs.enable_thinking`) via `/thinking` command or `Ctrl+Shift+T` shortcut; persists state per session |
| token-footer | `.pi/extensions/token-footer.ts` | Custom footer showing actual token counts (e.g. `2.9k/160k`) instead of percentage; toggle with `/token-footer` |
| undo | `.pi/extensions/undo.ts` | `/undo` command — auto-picks the most recent user message on the current branch and rolls back without summarization |
| bell | `.pi/extensions/bell.ts` | Plays a bell sound via PipeWire when the agent finishes its turn |

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
5. **Upstream docs** (`/app/pi/node_modules/@mariozechner/pi-coding-agent/docs/`) — Read for deep dives into APIs, themes, keybindings, etc.

The goal: no repetition, no bloat. An agent reads only what it needs for the task at hand.

## Documentation

Full markdown docs: `/app/pi/node_modules/@mariozechner/pi-coding-agent/docs/`

Key topics:
- `extensions.md` — Building custom extensions
- `skills.md` — Creating skill packages
- `themes.md` — Custom themes
- `keybindings.md` — Keyboard shortcuts
- `settings.md` — All configuration options
- `providers.md` — Provider setup
- `models.md` — Model configuration

## TODO

- [ ] Add the scout subagent which already has code available for reading and summarizing big files.
- [ ] Add some LSPs or Linting for node and python and cpp code using Automatic Post-Edit Linting via tool_result Hook in `.pi/extensions/linting.ts`
- [ ] ssh extension already exists for running commands on remote server...

## References

- **pi.dev** — https://pi.dev
- **GitHub** — https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent
- **npm** — https://www.npmjs.com/package/@mariozechner/pi-coding-agent
