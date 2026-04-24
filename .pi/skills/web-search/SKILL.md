---
name: web-search
description: >
  Web search and content extraction using DuckDuckGo (ddgs). Search the web for
  text, news, images, videos, and books. Extract readable content from any URL
  into markdown or plain text. Use when you need to look up information online,
  find documentation, search for recent news, or fetch page content from a URL.
---

# Web Search

Web search and content extraction powered by [ddgs](https://github.com/mesonix/ddgs).

## Setup

Run once before first use:

```bash
source /app/venv/bin/activate
```

## Web Search

Search the web for information. Supports text, news, images, videos, and books.

### Basic search

```bash
python web_search.py --query "your search query here"
```

### Search with options

```bash
# News search limited to last week
python web_search.py --query "AI breakthroughs" --type news --timelimit w

# Image search, 5 results
python web_search.py --query "mountain landscapes" --type images --limit 5

# Video search
python web_search.py --query "python tutorial" --type videos

# Output as markdown instead of JSON
python web_search.py --query "rust programming" --format markdown
```

### Search and extract top result

```bash
python web_search.py --query "Python documentation" --extract-top
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

Fetch and extract readable content from a URL:

```bash
python web_search.py --extract https://example.com
python web_search.py --extract https://en.wikipedia.org/wiki/Python --format markdown
```

## Options Reference

| Flag           | Description                                      | Default    |
| -------------- | ------------------------------------------------ | ---------- |
| `--query`      | Search query string                              | -          |
| `--extract`    | URL to extract content from                      | -          |
| `--type`       | Search type: text, news, images, videos, books   | text       |
| `--limit`      | Maximum number of results                        | 10         |
| `--format`     | Output format: json, markdown                    | json       |
| `--backend`    | Search backend: auto, duckduckgo, bing, brave    | auto       |
| `--region`     | Region code (us-en, uk-en, etc.)                 | us-en      |
| `--safesearch` | SafeSearch: on, moderate, off                    | moderate   |
| `--timelimit`  | Time filter: d (day), w (week), m (month), y    | -          |
| `--extract-top`| Extract content from the top search result        | -          |
| `-o`, `--output`| Save output to file                              | -          |
