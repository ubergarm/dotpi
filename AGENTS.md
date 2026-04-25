# pi — Terminal Coding Agent

Local LLM coding harness. See [README.md](README.md) for full setup, configuration, and usage.

## Quick Reference

- **Run:** `./pi.sh`
- **Config:** `.pi/settings.json` (default: `Qwen3.6-27B` on `localhost:8080`)
- **Models:** Discovered dynamically by `local-llama` extension from llama.cpp servers
- **Package:** `@mariozechner/pi-coding-agent` (^0.70.2) in `node_modules/`
- **Docs:** `node_modules/@mariozechner/pi-coding-agent/docs/`

## Skills

| Skill | Path | Notes |
|-------|------|-------|
| web-search | `.pi/skills/web-search/` | DuckDuckGo search & page extraction via `ddgs`. Read `SKILL.md` for usage details. Uses `uv` + Python 3.14 |

## Commands

| Command | Description |
|---------|-------------|
| `llama-params` | Show local-llama server defaults and current generation overrides |
| `thinking` | Toggle thinking mode on/off for local-llama models (`/thinking on`/`off`) |
| `token-footer` | Toggle custom token footer (actual token counts vs percentage) |

## Extensions

| Extension | Path | Notes |
|-----------|------|-------|
| local-llama | `.pi/extensions/local-llama/` | Dynamic model discovery from `localhost:8080` and `localhost:8088`; auto-detects vision & reasoning support via `/props`; injects generation params; status bar shows endpoint health with 🧠/💤 reasoning indicator |
| thinking-toggle | `.pi/extensions/thinking-toggle.ts` | Toggle thinking mode (`chat_template_kwargs.enable_thinking`) via `/thinking` command or `Ctrl+Shift+T` shortcut; persists state per session |
| token-footer | `.pi/extensions/token-footer.ts` | Custom footer showing actual token counts (e.g. `2.9k/160k`) instead of percentage; toggle with `/token-footer` |

## Key Files

| File | Purpose |
|------|---------|
| `.pi/settings.json` | Default provider, model, theme, thinking level |
| `.pi/extensions/local-llama/defaults.json` | Token pricing and generation settings (temperature, topP, reasoning budget, etc.) |
| `.pi/extensions/local-llama/index.ts` | local-llama extension source |
| `.pi/extensions/thinking-toggle.ts` | Thinking toggle extension source |
| `.pi/extensions/token-footer.ts` | Token footer extension source |
| `.pi/auth.json` | Auth credentials (stores `NOT_NEEDED` for local-llama) |
| `.pi/bin/fd` | Vendored `fd-find` binary |
| `pi.sh` | Launcher (sets `PI_CODING_AGENT_DIR`) |
| `Dockerfile` | Dev container (Debian bookworm, Node.js LTS, ripgrep, fd-find, git, build-essential, cmake) |
| `docker-build-image.sh` | Build the Docker image (`pi:latest`) |
| `docker-run.sh` | Run container (mounts workspace + host `uv` binary/cache) |

## Docker

```bash
./docker-build-image.sh  # Build
./docker-run.sh          # Run (mounts workspace + uv)
```
