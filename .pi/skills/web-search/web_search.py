#!/usr/bin/env python3
"""
Web Search and Content Extraction using DDGS

Performs web searches and extracts content from URLs using the ddgs library.
Supports text, news, images, videos, and books search across multiple backends.
"""

import argparse
import json
import os
import re
import sys
from pathlib import Path

try:
    from ddgs import DDGS
except ImportError:
    print("Error: ddgs is required.")
    print("Install it with: uv pip install ddgs")
    sys.exit(1)

try:
    import primp
except ImportError:
    print("Error: primp is required.")
    print("Install it with: uv pip install primp")
    sys.exit(1)


# --------------------------------------------------------------------------- #
# Helpers: cookies, headers, diagnostics
# --------------------------------------------------------------------------- #


def load_cookie_file(path: Path) -> dict[str, str]:
    """Load cookies from a Netscape/Mozilla cookies.txt or a JSON dict file."""
    text = path.read_text(encoding="utf-8").strip()
    # Try JSON first
    if text.startswith(("{", "[")):
        data = json.loads(text)
        if isinstance(data, dict):
            return {str(k): str(v) for k, v in data.items()}
        if isinstance(data, list) and data and isinstance(data[0], dict):
            # List of {name, value} or {name, value, domain, ...}
            return {
                str(c["name"]): str(c["value"])
                for c in data
                if "name" in c and "value" in c
            }
        raise ValueError("Unsupported JSON cookie file format.")
    # Netscape cookies.txt
    cookies: dict[str, str] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        parts = line.split("\t")
        if len(parts) >= 7:
            # Netscape format: domain, flag, path, secure, expiration, name, value
            name, value = parts[5], parts[6]
            cookies[name] = value
        elif len(parts) == 2:
            # Simple key\tvalue
            cookies[parts[0]] = parts[1]
        elif "=" in line:
            # Fallback: key=value
            name, value = line.split("=", 1)
            cookies[name.strip()] = value.strip()
    return cookies


def parse_headers(header_list: list[str]) -> dict[str, str]:
    """Parse repeatable -H flags into a dict. Split on first ':' or '='."""
    headers: dict[str, str] = {}
    for h in header_list:
        for sep in (":", "="):
            if sep in h:
                name, value = h.split(sep, 1)
                headers[name.strip()] = value.strip()
                break
        else:
            raise argparse.ArgumentTypeError(f"Header must contain ':' or '=': {h}")
    return headers


def diagnose_extract_error(url: str, exc: Exception, timeout: int) -> str:
    """Return an actionable error message for a primp extraction failure."""
    name = type(exc).__name__
    msg = str(exc)
    if name == "TimeoutError":
        return f"Error: Request timed out after {timeout}s. Try increasing --timeout."
    if name == "ConnectError":
        return (
            f"Error: Connection failed for {url}. "
            "The site may block datacenter IPs or use aggressive TLS fingerprinting. "
            "Try --proxy, --impersonate, or passing cookies."
        )
    if name == "StatusError":
        # primp.StatusError doesn't expose status_code directly on all versions,
        # so we grep the message.
        m = re.search(r"(\d{3})", msg)
        code = int(m.group(1)) if m else 0
        if code == 403:
            return (
                f"Error: HTTP 403 Forbidden from {url}. "
                "The site rejected the request. "
                "Try passing real browser cookies with --cookie or --cookie-file."
            )
        if code == 429:
            return (
                f"Error: HTTP 429 Rate limited by {url}. "
                "Slow down or rotate identity with --impersonate."
            )
        if code:
            return f"Error: HTTP {code} from {url}."
    if "DecodeError" in name or "decode" in msg.lower():
        return f"Error: Failed to decode response body from {url}."
    return f"Error: Extraction failed ({name}): {msg}"


def warn_content_issues(url: str, text: str) -> None:
    """Print warnings to stderr when extracted content looks bot-gated or paywalled."""
    lowered = text.lower()
    # JavaScript gate
    js_patterns = (
        "requires javascript",
        "enable javascript",
        "javascript is disabled",
        "javascript to run correctly",
        "please enable js",
    )
    if any(p in lowered for p in js_patterns):
        print(
            f"Warning: {url} appears to require JavaScript. "
            "Content is incomplete. Consider finding an RSS feed or API endpoint.",
            file=sys.stderr,
        )
        return
    # Paywall / login gate (only when body is short)
    if len(text) < 2000:
        paywall_patterns = (
            "sign in",
            "subscribe",
            "create an account",
            "log in",
            "login to continue",
            "premium content",
            "paywall",
        )
        if any(p in lowered for p in paywall_patterns):
            print(
                f"Warning: {url} appears login-gated or paywalled. "
                "Try --cookie or --cookie-file with authenticated session cookies.",
                file=sys.stderr,
            )
            return
    # Very short / empty
    stripped = re.sub(r"\s+", "", text)
    if len(stripped) < 200:
        print(
            f"Warning: Extracted content from {url} is very short. "
            "The page may be a redirect or bot challenge.",
            file=sys.stderr,
        )


# --------------------------------------------------------------------------- #
# Extraction via primp (bypasses ddgs.extract so we can control every option)
# --------------------------------------------------------------------------- #


def extract_with_primp(url: str, args: argparse.Namespace) -> dict[str, str | bytes]:
    """Fetch a URL with primp and return {"url": url, "content": ...}."""
    headers = parse_headers(args.header) if args.header else {}
    cookies: dict[str, str] = {}

    if args.cookie_file:
        cookies.update(load_cookie_file(Path(args.cookie_file)))
    if args.cookie:
        for part in args.cookie.split(";"):
            if "=" in part:
                k, v = part.split("=", 1)
                cookies[k.strip()] = v.strip()

    verify = True
    if args.no_verify:
        verify = False
    elif args.ca_cert:
        verify = str(args.ca_cert)

    client = primp.Client(
        proxy=args.proxy or os.environ.get("DDGS_PROXY"),
        timeout=args.timeout,
        impersonate=args.impersonate,
        impersonate_os=args.impersonate_os,
        verify=verify if isinstance(verify, bool) else True,
        ca_cert_file=verify if isinstance(verify, str) else None,
        headers=headers or None,
        cookies=cookies or None,
    )

    try:
        resp = client.get(url)
    except Exception as exc:
        print(diagnose_extract_error(url, exc, args.timeout), file=sys.stderr)
        sys.exit(1)

    if resp.status_code != 200:
        # Some primp versions raise StatusError on non-2xx, but guard anyway.
        fake_exc = type("StatusError", (Exception,), {})(f"HTTP {resp.status_code}")
        print(diagnose_extract_error(url, fake_exc, args.timeout), file=sys.stderr)
        sys.exit(1)

    fmt = getattr(args, "extract_fmt", None) or "text_markdown"
    content_map: dict[str, str | bytes] = {
        "text_markdown": resp.text_markdown,
        "text_plain": resp.text_plain,
        "text_rich": resp.text_rich,
        "text": resp.text,
        "content": resp.content,
    }
    content = content_map.get(fmt, resp.text_markdown)
    warn_content_issues(url, content if isinstance(content, str) else "")
    return {"url": url, "content": content}


# --------------------------------------------------------------------------- #
# Search wrappers
# --------------------------------------------------------------------------- #


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
    verify = True
    if args.no_verify:
        verify = False
    elif args.ca_cert:
        verify = str(args.ca_cert)

    ddgs = DDGS(
        proxy=args.proxy,
        timeout=args.timeout,
        verify=verify,
    )
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
        err_name = type(e).__name__
        msg = str(e)
        if search_type == "news" and (
            "DecodeError" in err_name or "Body collection error" in msg
        ):
            print(
                "Error: News search failed with a decoding error. "
                "This is a known intermittent DuckDuckGo issue. "
                "Try --type text --timelimit d (or w/m) as a workaround.",
                file=sys.stderr,
            )
        else:
            print(f"Error: Search failed ({err_name}): {msg}", file=sys.stderr)
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
        return run_extract_url(top_url, args)

    output = json.dumps(results, indent=2, ensure_ascii=False)

    return output


def run_extract_url(url, args):
    """Extract content from a single URL."""
    return extract_with_primp(url, args)["content"]


def run_extract(args):
    """Execute content extraction from a URL."""
    return extract_with_primp(args.extract, args)["content"]


# --------------------------------------------------------------------------- #
# CLI
# --------------------------------------------------------------------------- #


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

    # Search options
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

    # Extraction format
    parser.add_argument(
        "--extract-fmt",
        choices=["text_markdown", "text_plain", "text_rich", "text", "content"],
        default=None,
        help="Extraction format (default: text_markdown). "
        "text_markdown=markdown, text_plain=plain text, text_rich=rich text, "
        "text=raw HTML, content=raw bytes",
    )

    # HTTP / primp options
    parser.add_argument(
        "-H",
        "--header",
        action="append",
        metavar="HEADER",
        help="Custom HTTP header for extraction (repeatable). Example: -H 'Cookie: session=abc'",
    )
    parser.add_argument(
        "--cookie",
        metavar="STRING",
        help="Cookie string for extraction. Example: 'session=abc; user=me'",
    )
    parser.add_argument(
        "--cookie-file",
        type=Path,
        metavar="PATH",
        help="Path to a Netscape cookies.txt or JSON cookie file",
    )
    parser.add_argument(
        "--impersonate",
        default="random",
        help="Browser fingerprint for extraction (default: random)",
    )
    parser.add_argument(
        "--impersonate-os",
        default="random",
        help="OS fingerprint for extraction (default: random)",
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=10,
        help="Request timeout in seconds (default: 10)",
    )
    parser.add_argument(
        "--proxy",
        default=None,
        help="Proxy URL. Also reads DDGS_PROXY env var.",
    )
    parser.add_argument(
        "--no-verify",
        action="store_true",
        help="Skip TLS certificate verification",
    )
    parser.add_argument(
        "--ca-cert",
        type=Path,
        default=None,
        help="Path to custom CA bundle PEM file",
    )

    # Output
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
