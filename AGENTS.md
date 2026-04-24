# Pi (Coding Agent)

Pi is a minimal terminal coding harness. This directory contains a self-contained installation of the [pi coding agent](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent), configured for local LLM inference via llama.cpp.

## Project Structure

```
pi/
├── .pi/                          # Pi configuration directory
│   ├── agent/
│   │   └── default-pricing.json  # Token pricing for local models
│   ├── bin/
│   │   └── fd                    # fd-find binary (used by pi for file searching)
│   ├── extensions/
│   │   ├── local-llama/          # Dynamic model discovery extension
│   │   │   ├── index.ts           # Polls llama.cpp endpoints for loaded models
│   │   │   └── package.json
│   │   └── token-footer.ts       # Custom footer showing token counts (k/M format)
│   ├── sessions/                   # Session history (JSONL files, gitignored)
│   ├── skills/
│   │   └── web-search/            # DuckDuckGo web search skill
│   │       ├── SKILL.md            # Skill instructions for the model
│   │       ├── web_search.py       # Search/extract CLI script
│   │       ├── pyproject.toml      # Python project (ddgs dependency)
│   │       └── .venv/              # Python virtualenv
│   ├── settings.json               # Project-level pi settings
│   └── auth.json                   # OAuth/API credentials (gitignored)
├── Dockerfile                      # Container image (debian + Node.js + dev tools)
├── docker-build-image.sh           # Build the Docker image
├── docker-run.sh                   # Run the container with host networking + uv mounts
├── package.json                    # npm dependency: @mariozechner/pi-coding-agent
├── pi.sh                           # Launcher script (sets PI_CODING_AGENT_DIR)
└── README.md
```

## Configuration

All configuration lives in `.pi/`:

- **Settings:** `.pi/settings.json` — default provider, model, theme, thinking level
- **Skills:** `.pi/skills/` — project-local skills (currently: `web-search`)
- **Extensions:** `.pi/extensions/` — project-local extensions (currently: `local-llama`, `token-footer`)

Current settings (`.pi/settings.json`):

| Setting | Value |
|---------|-------|
| `defaultProvider` | `local-llama-8080` |
| `defaultModel` | `Qwen3.6-27B` |
| `defaultThinkingLevel` | `medium` |
| `theme` | `dark` |

## Running Pi

```bash
# Using the launcher script (recommended)
./pi.sh

# Or directly
node node_modules/@mariozechner/pi-coding-agent/dist/cli.js --config-dir .pi
```

## Model Registration

Models are registered **dynamically** via the `local-llama` extension (`.pi/extensions/local-llama/index.ts`). On startup it polls two local llama.cpp endpoints:

| Endpoint Name | URL |
|---------------|-----|
| `local-llama-8080` | `http://localhost:8080/v1` |
| `local-llama-8088` | `http://localhost:8088/v1` |

It calls the OpenAI-compatible `/models` endpoint on each server, discovers whatever GGUF models are loaded, and registers them as providers. No static model list is needed. If an endpoint is down, it logs a warning and continues with whatever is available.

### Pricing

Default API request pricing is stored in `.pi/agent/default-pricing.json`. This file is read by the extension at startup and applied to every dynamically discovered model. Currently set to (per 1M tokens):

| Field | Value |
|-------|-------|
| `input` | 3 |
| `output` | 15 |
| `cacheRead` | 0.25 |
| `cacheWrite` | 3.75 |

To change pricing, edit `default-pricing.json` and run `/reload` in pi.

> **Note:** The old `.pi/agent/models.json` static config is **not used** by the local-llama extension. Models are discovered live from the running servers. Do not edit or maintain a static `models.json` — it will be ignored.

## Extensions

### local-llama

Dynamically discovers GGUF models from local llama.cpp servers. Registers each endpoint as a separate provider. See `.pi/extensions/local-llama/index.ts` for implementation.

### token-footer

Replaces the default footer to show actual context token counts (e.g. `2.9k/160k`) instead of percentage. Also displays I/O tokens, cache read/write, cost, and git branch. Toggle with `/token-footer` in pi. See `.pi/extensions/token-footer.ts` for implementation.

## Available Skills

| Skill | Command | Description |
|-------|---------|-------------|
| **web-search** | `/skill:web-search` | Search the web via DuckDuckGo (text, news, images, videos, books), or extract content from a specific URL |

### Web Search Setup

Run once before first use:

```bash
cd .pi/skills/web-search
uv venv .venv --relocatable -p 3.13 --python-preference=only-managed
uv sync
```

Then use from within pi or directly:

```bash
# Search
uv run python web_search.py --query "your query"

# Extract a page
uv run python web_search.py --extract https://example.com
```

## Docker

The Dockerfile builds a Debian Bookworm container with Node.js (LTS), git, curl, jq, ripgrep, fd-find, build-essential, and cmake.

```bash
# Build the image
./docker-build-image.sh

# Run the container (mounts current dir + uv)
./docker-run.sh
```

The container runs as user `job` (UID/GID matched to host). `docker-run.sh` mounts the host `uv` binary and Python cache for seamless Python project support.

## Documentation

Full pi docs at `/app/pi-mono/packages/coding-agent/docs/*.md` — covers extensions, themes, skills, prompt templates, TUI, keybindings, SDK, custom providers, models, and more.
