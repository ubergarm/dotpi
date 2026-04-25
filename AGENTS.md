# pi — Terminal Coding Agent

Local LLM coding harness. See [README.md](README.md) for full setup, configuration, and usage.

## Quick Reference

- **Run:** `./pi.sh`
- **Config:** `.pi/settings.json` (default: `Qwen3.6-27B` on `localhost:8080`)
- **Models:** Discovered dynamically by `local-llama` extension from llama.cpp servers
- **Docs:** `/app/pi-mono/packages/coding-agent/docs/`

## Skills

| Skill | Path | Notes |
|-------|------|-------|
| web-search | `.pi/skills/web-search/` | Read `SKILL.md` for usage details |

## Commands

| Command | Description |
|---------|-------------|
| `llama-params` | Show local-llama server defaults and current generation overrides |

## Extensions

| Extension | Path | Notes |
|-----------|------|-------|
| local-llama | `.pi/extensions/local-llama/` | Dynamic model discovery; auto-detects vision & reasoning support via `/props`; injects generation params into requests; status bar shows endpoint health with 🧠/💤 reasoning indicator |
| token-footer | `.pi/extensions/token-footer.ts` | Token count footer (k/M format) |

## Key Files

| File | Purpose |
|------|---------|
| `.pi/settings.json` | Default provider, model, theme, thinking level |
| `.pi/extensions/local-llama/default-pricing.json` | Token pricing for local models |
| `.pi/extensions/local-llama/default-settings.json` | Generation settings (temperature, topP, reasoning budget, etc.) |
| `pi.sh` | Launcher (sets `PI_CODING_AGENT_DIR`) |
