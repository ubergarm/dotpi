---
name: web-search
description: >
  Web search and content extraction using DuckDuckGo (ddgs). Two main uses:
  (1) Search the web for text, news, images, videos, and books.
  (2) Extract readable content from a specific URL into markdown or plain text.
  Use this skill whenever you need to look up information online, find documentation,
  or fetch the content of a specific web page.
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

### Basic search

```bash
uv run python web_search.py --query "your search query here"
```

### Search with options

```bash
# News search limited to last week
uv run python web_search.py --query "AI breakthroughs" --type news --timelimit w

# Image search, 5 results
uv run python web_search.py --query "mountain landscapes" --type images --limit 5

# Video search
uv run python web_search.py --query "python tutorial" --type videos

```

### Search and extract top result

```bash
uv run python web_search.py --query "Python documentation" --extract-top
```

### Search types

| Type   | Description        |
| ------ | ------------------ |
| text   | General web search |
| news   | News articles      |
| images | Image search       |
| videos | Video search       |
| books  | Book search        |

## Extract Page Content

Fetch and extract readable content from a URL. Always save to a temp file if the content is too large to read in one go.

```bash
uv run python web_search.py --extract https://example.com --extract-fmt text_markdown > /tmp/page.md 2>&1
```

### Extraction formats

The `--extract-fmt` flag controls how the page content is processed:

```bash
# Default: markdown
uv run python web_search.py --extract https://example.com --extract-fmt text_markdown

# Plain text
uv run python web_search.py --extract https://example.com --extract-fmt text_plain

# Rich text (preserves more formatting)
uv run python web_search.py --extract https://example.com --extract-fmt text_rich

# Raw HTML
uv run python web_search.py --extract https://example.com --extract-fmt text

# Raw bytes (no wrapper, writes directly to stdout or file)
uv run python web_search.py --extract https://example.com --extract-fmt content -o page.bin
```

| Format          | Description                           |
| --------------- | ------------------------------------- |
| `text_markdown` | Markdown (default)                    |
| `text_plain`    | Plain text                            |
| `text_rich`     | Rich text with preserved formatting   |
| `text`          | Raw HTML/JSON                         |
| `content`       | Raw bytes (no wrapper)                |

> **Note:** The underlying `primp` HTTP client uses `impersonate="random"` to rotate browser
> fingerprints. Some sites (e.g. Reddit) actively block certain fingerprints, so `--extract`
> may return HTTP 403 intermittently. If this happens, simply retry — a different random
> fingerprint will succeed on subsequent attempts.

## Options Reference

| Flag           | Description                                      | Default    |
| -------------- | ------------------------------------------------ | ---------- |
| `--query`      | Search query string                              | -          |
| `--extract`    | URL to extract content from                      | -          |
| `--type`       | Search type: text, news, images, videos, books   | text       |
| `--limit`      | Maximum number of results                        | 10         |

| `--backend`    | Search backend: auto, duckduckgo, bing, brave    | auto       |
| `--region`     | Region code (us-en, uk-en, etc.)                 | us-en      |
| `--safesearch` | SafeSearch: on, moderate, off                    | moderate   |
| `--timelimit`  | Time filter: d (day), w (week), m (month), y    | -          |
| `--extract-top`| Extract content from the top search result        | -          |
| `--extract-fmt`| Extraction format (see table above)               | text_markdown |
| `-o`, `--output`| Save output to file                              | -          |
