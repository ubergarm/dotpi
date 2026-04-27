# pi — Terminal Coding Agent

Local LLM coding harness. See [README.md](README.md) for full setup, configuration, and usage.

## Quick Reference

- **Run:** `./pi.sh`
- **Config:** `.pi/settings.json` (default: `ubergarm/Kimi-K2.6-GGUF` on `localhost:8088`)
- **Models:** Discovered dynamically by `local-llama` extension from llama.cpp servers
- **Package:** `@mariozechner/pi-coding-agent` (^0.70.2) in `node_modules/`
- **Docs:** `node_modules/@mariozechner/pi-coding-agent/docs/`

## Skills

| Skill | Path | Notes |
|-------|------|-------|
| web-search | `.pi/skills/web-search/` | DuckDuckGo search & page extraction via `ddgs`. Read `SKILL.md` for usage details. Uses `uv` + Python 3.13 |

## Commands

| Command | Description |
|---------|-------------|
| `llama-params` | Show local-llama server defaults and current generation overrides |
| `thinking` | Toggle thinking mode on/off for local-llama models (`/thinking on`/`off`) |
| `token-footer` | Toggle custom token footer (actual token counts vs percentage) |
| `undo` | Roll back to the most recent user message, placing its text in the editor for re-submission |

## Extensions

| Extension | Path | Notes |
|-----------|------|-------|
| local-llama | `.pi/extensions/local-llama/` | Dynamic model discovery from `localhost:8080` and `localhost:8088`; auto-detects vision & reasoning support via `/props`; injects generation params; status bar shows endpoint health with 🧠/💤 reasoning indicator |
| thinking-toggle | `.pi/extensions/thinking-toggle.ts` | Toggle thinking mode (`chat_template_kwargs.enable_thinking`) via `/thinking` command or `Ctrl+Shift+T` shortcut; persists state per session |
| token-footer | `.pi/extensions/token-footer.ts` | Custom footer showing actual token counts (e.g. `2.9k/160k`) instead of percentage; toggle with `/token-footer` |
| undo | `.pi/extensions/undo.ts` | `/undo` command — auto-picks the most recent user message on the current branch and rolls back without summarization |
| bell | `.pi/extensions/bell.ts` | Plays 1–5 bell rings via PipeWire when the agent finishes, scaling with duration (<1m→1, 1–3m→2, 3–5m→3, 5–15m→4, ≥15m→5) |

## Key Files

| File | Purpose |
|------|---------|
| `.pi/settings.json` | Default provider, model, theme, thinking level |
| `.pi/extensions/local-llama/defaults.json` | Token pricing and generation settings (temperature, topP, reasoning budget, etc.) |
| `.pi/extensions/local-llama/index.ts` | local-llama extension source |
| `.pi/extensions/thinking-toggle.ts` | Thinking toggle extension source |
| `.pi/extensions/token-footer.ts` | Token footer extension source |
| `.pi/extensions/undo.ts` | Undo extension source |
| `.pi/extensions/bell.ts` | Bell extension source (plays 1–5 rings on `agent_end` based on agent duration) |
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

### Agent Environment

The container runs as user `job` with passwordless `sudo`. You can run `sudo apt-get update` to search for or install additional packages. A broad set of CLI utilities is pre-installed (networking, binary inspection, process tracing, archives, etc.). If you need to learn how a pre-installed tool works, use `tldr <command>` for a quick summary, `man <command>` for full documentation, or `dpkg -l | grep <pattern>` to discover available packages.

## Documentation

Full upstream docs: `/app/pi/node_modules/@mariozechner/pi-coding-agent/docs/`

Key topics:
- `extensions.md` — Building custom extensions
- `skills.md` — Creating skill packages
- `themes.md` — Custom themes
- `keybindings.md` — Keyboard shortcuts
- `settings.md` — All configuration options
- `providers.md` — Provider setup
- `models.md` — Model configuration
