# Pi (Coding Agent)

Config is in `.pi/`:

- **Settings:** `.pi/settings.json` — default provider, model, theme
- **Skills:** `.pi/skills/` — project-local skills
- **Extensions:** `.pi/extensions/` — project-local extensions

## Model Registration

Models are registered **dynamically** via the `local-llama` extension (`.pi/extensions/local-llama/index.ts`). On startup it polls two local endpoints:

| Endpoint | URL |
|----------|-----|
| `local-llama-8080` | `http://localhost:8080/v1` |
| `local-llama-8088` | `http://localhost:8088/v1` |

It calls the OpenAI-compatible `/models` endpoint on each server, discovers whatever GGUF models are loaded, and registers them as providers. No static model list is needed.

### Pricing

Default API request pricing is stored in `.pi/agent/default-pricing.json`. This file is read by the extension at startup and applied to every dynamically discovered model. Currently set to Claude Opus 4.6 rates (per 1M tokens):

| Field | Value |
|-------|-------|
| `input` | 15.00 |
| `output` | 75.00 |
| `cacheRead` | 1.25 |
| `cacheWrite` | 18.75 |

To change pricing, edit `default-pricing.json` and run `/reload` in pi.

> **Note:** The old `.pi/agent/models.json` static config is **not used** by the local-llama extension. Models are discovered live from the running servers. Do not edit or maintain a static `models.json` — it will be ignored.

## Documentation

Full docs at `/app/pi-mono/packages/coding-agent/docs/*.md` — covers extensions, themes, skills, prompt templates, TUI, keybindings, SDK, custom providers, models, and more.

## Available Skills

| Skill | Command | Description |
|-------|---------|-------------|
| **web-search** | `/skill:web-search` | Search the web via DuckDuckGo (text, news, images, videos, books) and extract page content |
| **web-fetch** | `/skill:web-fetch` | Fetch a URL and extract readable content as markdown or plain text |
