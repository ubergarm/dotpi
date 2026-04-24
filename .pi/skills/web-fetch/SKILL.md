---
name: web-fetch
description: >
  Fetch and extract readable content from a web page URL. Converts HTML pages
  to clean markdown or plain text. Use when you have a URL and need its text
  content, documentation, or article body — not for searching the web.
---

# Web Fetch

Extract readable content from a web page URL.

## Setup

Run once before first use:

```bash
source /app/venv/bin/activate
```

## Usage

```bash
# Fetch as markdown (default)
python fetch.py https://example.com

# Fetch as JSON
python fetch.py https://example.com --format json

# Save to a file
python fetch.py https://example.com -o output.md
```

## Options

| Flag           | Description                    | Default    |
| -------------- | ------------------------------ | ---------- |
| `--format`     | Output: `markdown` or `json`   | markdown   |
| `-o`, `--output` | Save to file instead of stdout | -          |
