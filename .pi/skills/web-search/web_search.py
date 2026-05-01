#!/usr/bin/env python3
"""
Web Search and Content Extraction using DDGS

Performs web searches and extracts content from URLs using the ddgs library.
Supports text, news, images, videos, and books search across multiple backends.
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


def search_text(ddgs, query, region, safesearch, timelimit, max_results, backend):
    return ddgs.text(
        query=query,
        region=region,
        safesearch=safesearch,
        timelimit=timelimit,
        max_results=max_results,
        backend=backend,
    )


def search_news(ddgs, query, region, safesearch, timelimit, max_results, backend):
    return ddgs.news(
        query=query,
        region=region,
        safesearch=safesearch,
        timelimit=timelimit,
        max_results=max_results,
        backend=backend,
    )


def search_images(ddgs, query, region, safesearch, timelimit, max_results, backend):
    return ddgs.images(
        query=query,
        region=region,
        safesearch=safesearch,
        timelimit=timelimit,
        max_results=max_results,
        backend=backend,
    )


def search_videos(ddgs, query, region, safesearch, timelimit, max_results, backend):
    return ddgs.videos(
        query=query,
        region=region,
        safesearch=safesearch,
        timelimit=timelimit,
        max_results=max_results,
        backend=backend,
    )


def search_books(ddgs, query, max_results, backend):
    return ddgs.books(
        query=query,
        max_results=max_results,
        backend=backend,
    )


SEARCH_FUNCTIONS = {
    "text": search_text,
    "news": search_news,
    "images": search_images,
    "videos": search_videos,
    "books": search_books,
}


def run_search(args):
    """Execute a search query."""
    ddgs = DDGS()
    search_type = args.type
    search_fn = SEARCH_FUNCTIONS[search_type]

    kwargs = {
        "ddgs": ddgs,
        "query": args.query,
        "max_results": args.limit,
        "backend": args.backend,
    }

    if search_type != "books":
        kwargs["region"] = args.region
        kwargs["safesearch"] = args.safesearch
        kwargs["timelimit"] = args.timelimit

    try:
        results = search_fn(**kwargs)
    except Exception as e:
        print(f"Error: Search failed: {e}", file=sys.stderr)
        sys.exit(1)

    if not results:
        print("No results found.", file=sys.stderr)
        sys.exit(0)

    if args.extract_top:
        top_url = (
            results[0].get("href")
            or results[0].get("url")
            or results[0].get("content", "")
        )
        if not top_url:
            print("Error: Could not determine URL from top result.", file=sys.stderr)
            sys.exit(1)
        print(f"Extracting content from top result: {top_url}", file=sys.stderr)
        return run_extract_url(ddgs, top_url, args)

    output = json.dumps(results, indent=2, ensure_ascii=False)

    return output


def run_extract_url(ddgs, url, args):
    """Extract content from a single URL."""
    extract_fmt = getattr(args, "extract_fmt", None) or "text_markdown"
    try:
        result = ddgs.extract(url=url, fmt=extract_fmt)
    except Exception as e:
        print(f"Error: Extraction failed: {e}", file=sys.stderr)
        sys.exit(1)

    if not result:
        print("Error: No content extracted.", file=sys.stderr)
        sys.exit(1)

    return result.get("content", "")


def run_extract(args):
    """Execute content extraction from a URL."""
    ddgs = DDGS()
    return run_extract_url(ddgs, args.extract, args)


def main():
    parser = argparse.ArgumentParser(
        description="Web search and content extraction using DDGS.",
    )

    search_group = parser.add_mutually_exclusive_group(required=True)
    search_group.add_argument(
        "--query",
        help="Search query string",
    )
    search_group.add_argument(
        "--extract",
        help="URL to extract content from",
    )

    parser.add_argument(
        "--type",
        choices=["text", "news", "images", "videos", "books"],
        default="text",
        help="Search type (default: text)",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Maximum number of results (default: 10)",
    )
    parser.add_argument(
        "--backend",
        default="auto",
        help="Search backend: auto, duckduckgo, bing, brave, google, mojeek, yandex, yahoo, wikipedia (default: auto)",
    )
    parser.add_argument(
        "--region",
        default="us-en",
        help="Region code, e.g. us-en, uk-en (default: us-en)",
    )
    parser.add_argument(
        "--safesearch",
        choices=["on", "moderate", "off"],
        default="moderate",
        help="SafeSearch level (default: moderate)",
    )
    parser.add_argument(
        "--timelimit",
        choices=["d", "w", "m", "y"],
        default=None,
        help="Time filter: d=day, w=week, m=month, y=year",
    )
    parser.add_argument(
        "--extract-top",
        action="store_true",
        help="Extract content from the top search result URL",
    )
    parser.add_argument(
        "--extract-fmt",
        choices=["text_markdown", "text_plain", "text_rich", "text", "content"],
        default=None,
        help="Extraction format (default: text_markdown). "
             "text_markdown=markdown, text_plain=plain text, text_rich=rich text, "
             "text=raw HTML, content=raw bytes",
    )
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=None,
        help="Save output to file instead of stdout",
    )

    args = parser.parse_args()

    if args.extract_top and args.extract:
        parser.error("--extract-top cannot be used with --extract")

    if args.extract:
        output = run_extract(args)
    else:
        output = run_search(args)

    if isinstance(output, bytes):
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_bytes(output)
            print(f"Saved to: {args.output}", file=sys.stderr)
        else:
            sys.stdout.buffer.write(output)
    else:
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            args.output.write_text(output, encoding="utf-8")
            print(f"Saved to: {args.output}", file=sys.stderr)
        else:
            print(output)


if __name__ == "__main__":
    main()
