#!/usr/bin/env python3
"""
Fetch and extract readable content from a URL using ddgs.

Converts HTML pages to clean markdown or JSON.
"""

import argparse
import json
import sys
from pathlib import Path

try:
    from ddgs import DDGS
except ImportError:
    print("Error: ddgs is required.")
    print("Install it with: uv pip install ddgs")
    sys.exit(1)


def fetch(url: str, fmt: str = "markdown") -> str:
    """Extract readable content from a URL."""
    ddgs = DDGS()

    try:
        result = ddgs.extract(url=url, fmt="text_markdown")
    except Exception as e:
        print(f"Error: Extraction failed: {e}", file=sys.stderr)
        sys.exit(1)

    if not result:
        print("Error: No content extracted.", file=sys.stderr)
        sys.exit(1)

    if fmt == "json":
        return json.dumps(result, indent=2, ensure_ascii=False)

    # Markdown output
    url_val = result.get("url", url)
    content = result.get("content", "")
    return f"# {url_val}\n\n{content}"


def main():
    parser = argparse.ArgumentParser(
        description="Fetch and extract readable content from a URL.",
    )
    parser.add_argument("url", help="URL to fetch")
    parser.add_argument(
        "--format",
        choices=["markdown", "json"],
        default="markdown",
        help="Output format (default: markdown)",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="Save output to file instead of stdout",
    )

    args = parser.parse_args()
    output = fetch(args.url, args.format)

    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output, encoding="utf-8")
        print(f"Saved to: {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
