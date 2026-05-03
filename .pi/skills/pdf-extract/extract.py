#!/usr/bin/env python3
"""Extract text from PDF files using PyMuPDF4LLM.

Outputs clean Markdown (or plain text) with structure:
headings, tables, lists, images, reading order.

Usage:
    uv run python extract.py <pdf> [-o OUT] [--pages RANGES] [--text] [--info]

Examples:
    uv run python extract.py report.pdf
    uv run python extract.py report.pdf -o report.md
    uv run python extract.py report.pdf --pages 1-5,10
    uv run python extract.py report.pdf --text
    uv run python extract.py report.pdf --info
    uv run python extract.py report.pdf --legacy    # better for complex layouts
    uv run python extract.py report.pdf --legacy --dpi 300
"""

import argparse
import re
import sys


def extract(
    pdf_path: str,
    pages: list[int] | None = None,
    *,
    legacy: bool = False,
    dpi: int = 150,
    force_text: bool = True,
    use_ocr: bool = True,
    page_separators: bool = False,
) -> str:
    """Extract PDF content as Markdown.

    Args:
        pdf_path: Path to the PDF file.
        pages: List of 0-indexed page numbers to extract.
        legacy: Use legacy (non-layout) extraction mode. Often better for
            visually complex PDFs (scattered text, two-column layouts, cover pages).
        dpi: Resolution for image/graphics processing.
        force_text: Output text even when on an image background.
        use_ocr: Enable OCR fallback for text extraction.
        page_separators: Include page separator markers in output.
    """
    import pymupdf4llm

    if legacy:
        pymupdf4llm.use_layout(False)
    else:
        pymupdf4llm.use_layout(True)

    kwargs: dict = {
        "dpi": dpi,
        "force_text": force_text,
        "page_separators": page_separators,
    }
    # use_ocr is only valid in layout mode
    if not legacy:
        kwargs["use_ocr"] = use_ocr

    if pages:
        return pymupdf4llm.to_markdown(pdf_path, pages=pages, **kwargs)
    return pymupdf4llm.to_markdown(pdf_path, **kwargs)


def pdf_info(pdf_path: str) -> str:
    """Show PDF metadata and page count."""
    import fitz

    doc = fitz.open(pdf_path)
    lines = [f"Pages: {doc.page_count}"]
    meta = doc.metadata or {}
    for key in ("title", "author", "subject", "creator", "producer", "creationDate", "modDate"):
        val = meta.get(key)
        if val:
            lines.append(f"{key}: {val}")
    doc.close()
    return "\n".join(lines)


def markdown_to_text(md: str) -> str:
    """Strip Markdown formatting to produce plain text."""
    # Remove images
    text = re.sub(r"!\[.*?\]\(.*?\)", "", md)
    # Remove links but keep text
    text = re.sub(r"\[(.*?)\]\(.*?\)", r"\1", text)
    # Remove headings markers
    text = re.sub(r"^#+\s*", "", text, flags=re.MULTILINE)
    # Remove bold/italic markers
    text = re.sub(r"\*+(.*?)\*+", r"\1", text)
    text = re.sub(r"__(.*?)__", r"\1", text)
    # Remove horizontal rules
    text = re.sub(r"^\s*[-*_]{3,}\s*$", "", text, flags=re.MULTILINE)
    # Remove blockquote markers
    text = re.sub(r"^>\s*", "", text, flags=re.MULTILINE)
    # Collapse multiple blank lines
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def parse_pages(page_str: str) -> list[int]:
    """Parse page spec like '1-5,10,12-15' into a list of 0-indexed page numbers."""
    pages: list[int] = []
    for part in page_str.split(","):
        part = part.strip()
        if "-" in part:
            start, end = part.split("-", 1)
            pages.extend(range(int(start) - 1, int(end)))
        else:
            pages.append(int(part) - 1)
    return sorted(set(pages))


def main():
    parser = argparse.ArgumentParser(
        description="Extract text from PDF files using PyMuPDF4LLM",
    )
    parser.add_argument("pdf", help="Path to the PDF file")
    parser.add_argument("-o", "--output", help="Output file (default: stdout)")
    parser.add_argument(
        "--pages",
        help="Page ranges, e.g. '1-5,10,12-15' (1-indexed)",
    )
    parser.add_argument(
        "--text",
        action="store_true",
        help="Output plain text instead of Markdown",
    )
    parser.add_argument(
        "--info",
        action="store_true",
        help="Show PDF metadata and page count only",
    )
    parser.add_argument(
        "--legacy",
        action="store_true",
        help="Use legacy (non-layout) extraction mode. Often better for "
             "visually complex PDFs with scattered text or multi-column layouts.",
    )
    parser.add_argument(
        "--dpi",
        type=int,
        default=150,
        help="Resolution for image/graphics processing (default: 150)",
    )
    parser.add_argument(
        "--force-text",
        action="store_true",
        default=True,
        help="Output text even on image backgrounds (default: on)",
    )
    args = parser.parse_args()

    if args.info:
        result = pdf_info(args.pdf)
    else:
        pages = parse_pages(args.pages) if args.pages else None
        result = extract(
            args.pdf,
            pages=pages or None,
            legacy=args.legacy,
            dpi=args.dpi,
            force_text=args.force_text,
        )
        if args.text:
            result = markdown_to_text(result)

    if args.output:
        with open(args.output, "w", encoding="utf-8") as f:
            f.write(result)
        print(f"Written to {args.output}", file=sys.stderr)
    else:
        print(result)


if __name__ == "__main__":
    main()
