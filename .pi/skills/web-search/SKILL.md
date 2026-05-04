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
uv run python web_search.py --extract https://example.com --extract-fmt text_markdown --output /tmp/page.md
```

### Extraction formats

`--extract-fmt` values: `text_markdown` (default, markdown), `text_plain`, `text_rich`, `text` (raw HTML), `content` (raw bytes).

> **Note:** `--extract` may intermittently return HTTP 403 on some sites due to rotating browser
> fingerprints. Retrying sometimes helps, but some sites (e.g. Reddit) are consistently blocked.
> See **Known Limitations & Workarounds** below.

## Known Limitations & Workarounds

| Site / Pattern | Issue | Workaround |
|----------------|-------|------------|
| **GitHub (`github.com`)** | HTML is JS-heavy; extraction returns only navigation markup, no commits/PRs/issues. | Use `api.github.com` endpoints (no auth needed for public repos). Examples: `api.github.com/repos/{owner}/{repo}/commits`, `/pulls`, `/issues/{n}/comments`. |
| **Reddit** | Consistently returns HTTP 403 / bot challenge on all endpoints (`www`, `old`, `.json`). | Fall back to `--type text` search for post titles/URLs instead of extracting. |
| **Substack** | Homepage requires JavaScript; extraction returns "enable JS" message. | Use the RSS feed at `/feed` (e.g. `localbench.substack.com/feed`). |
| **HuggingFace (`huggingface.co/models?sort=trending`)** | Extraction returns filter UI only, no actual model listings. | Search for `"Hugging Face Trending Models Digest"` or use the `agents-radar` GitHub issues. |
| **Weather / News sites** | Often login-gated or paywalled; extraction returns signup prompts. | Rely on search result snippets, or try lightweight APIs like `wttr.in`. |
| **`--type news`** | Intermittently fails with `DecodeError: Body collection error`. | Fall back to `--type text --timelimit d` (or `w`/`m`). |
| **`site:` + `--type news`** | Frequently causes `DecodeError`. | Use `--type text` without `site:` and filter URLs manually, or extract the target site directly if it works. |
| **Shell redirection (`> /tmp/file`)** | Can truncate or mix stderr into output. | Prefer the built-in `--output /tmp/file` flag. |

## Reliable Patterns

**Hacker News front page** — extracts cleanly as a Markdown table:
```bash
uv run python web_search.py --extract https://news.ycombinator.com/ --extract-fmt text_markdown --output /tmp/hn.md
```

**GitHub API (commits)**:
```bash
uv run python web_search.py --extract https://api.github.com/repos/ikawrakow/ik_llama.cpp/commits?per_page=10 --extract-fmt text_markdown --output /tmp/commits.json
```

**Substack RSS**:
```bash
uv run python web_search.py --extract https://localbench.substack.com/feed --extract-fmt text_markdown --output /tmp/feed.xml
```

## Options

Run with `--help` for all options.
