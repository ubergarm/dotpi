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

## Extensions

| Extension | Path | Notes |
|-----------|------|-------|
| local-llama | `.pi/extensions/local-llama/` | Dynamic model discovery from llama.cpp endpoints |
| token-footer | `.pi/extensions/token-footer.ts` | Token count footer (k/M format) |

## Key Files

| File | Purpose |
|------|---------|
| `.pi/settings.json` | Default provider, model, theme, thinking level |
| `.pi/agent/default-pricing.json` | Token pricing (edit + `/reload` in pi) |
| `pi.sh` | Launcher (sets `PI_CODING_AGENT_DIR`) |
