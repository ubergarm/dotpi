---
name: web-search
description: >
  Web search (text/news/images/videos/books) and URL content extraction using DuckDuckGo (ddgs and primp).
---

# Web Search

Web search and content extraction powered by [ddgs](https://github.com/mesonix/ddgs).

## Web Search

All commands below run from `.pi/skills/web-search` using `uv run`. The venv should already exist.
If a command fails because it's missing, create it once:

```bash
uv venv .venv --relocatable --python 3.13 --python-preference=only-managed
uv sync
```

---

### Search

```bash
uv run python web_search.py --query "your query here"
```

Common patterns:

```bash
uv run python web_search.py --query "AI news" --type news --timelimit w
uv run python web_search.py --query "mountains" --type images --limit 5
uv run python web_search.py --query "Python docs" --extract-top
```

Search types: `text`, `news`, `images`, `videos`, `books`.

## Extract Page Content

Fetch and extract readable content from a URL. Always save to a temp file if the content is too large to read in one go.

```bash
uv run python web_search.py --extract https://example.com --extract-fmt text_markdown > /tmp/page.md 2>&1
```

### Extraction formats

`--extract-fmt` values: `text_markdown` (default, markdown), `text_plain`, `text_rich`, `text` (raw HTML), `content` (raw bytes).

> **Note:** `--extract` may intermittently return HTTP 403 on some sites (e.g. Reddit) due to
> rotating browser fingerprints — just retry.

## Options

Run with `--help` for all options.
