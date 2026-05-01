---
name: pdf-extract
description: Extract clean text and structured Markdown from PDF files using PyMuPDF4LLM. Handles multi-column layouts, tables, headings, lists, and images. Use when converting PDFs to readable text, extracting content for LLM ingestion, or inspecting PDF structure. Does NOT handle scanned PDFs (no OCR).
---

# PDF Extract

Fast PDF-to-text extraction using PyMuPDF4LLM. Outputs structured Markdown with headings, tables, lists, and image references.

## Setup

Run once before first use:

```bash
cd /app/pi/.pi/skills/pdf-extract
uv venv .venv --relocatable -p 3.13 --python-preference=only-managed
uv sync
```

## Usage

```bash
cd /app/pi/.pi/skills/pdf-extract

# Extract to stdout (Markdown)
uv run python extract.py /path/to/file.pdf

# Extract to file
uv run python extract.py /path/to/file.pdf -o output.md

# Extract specific pages (1-indexed)
uv run python extract.py /path/to/file.pdf --pages 1-5,10

# Plain text output (strip Markdown formatting)
uv run python extract.py /path/to/file.pdf --text

# Legacy mode (better for complex layouts, multi-column, cover pages)
uv run python extract.py /path/to/file.pdf --legacy

# Higher resolution for image-heavy pages
uv run python extract.py /path/to/file.pdf --dpi 300

# Show PDF metadata and page count
uv run python extract.py /path/to/file.pdf --info
```

## What It Extracts

- **Headings** → `#`, `##`, `###` Markdown headers
- **Tables** → Markdown table syntax
- **Lists** → `*` bullet points, `1.` numbered lists
- **Images** → `![image](...)` references
- **Multi-column layouts** → proper reading order detection
- **Links** → `[text](url)` Markdown links

## Limitations

- **No OCR** — only works with PDFs that have embedded/selectable text. For scanned PDFs, use a tool with OCR (Marker, Docling, MinerU).
- **No formula recognition** — math formulas appear as images or raw text.
- **Accuracy depends on PDF quality** — well-structured PDFs produce the best output.

## Detailed Page Reading

For pages that need careful visual inspection (complex diagrams, charts, or tricky layouts), render individual pages as images and read them with multimodal input:

```bash
# Check page count first (both extract.py --pages and pdftoppm -f/-l are 1-indexed)
pdfinfo /path/to/file.pdf | grep Pages

# Render specific pages as PNG (poppler-utils must be installed)
pdftoppm -png -f 3 -l 5 /path/to/file.pdf /tmp/page
# Produces /tmp/page-3.png, /tmp/page-4.png, /tmp/page-5.png

# Then read the images with the read tool for pixel-level detail
```

> **Note:** Both `--pages` and `-f`/`-l` are 1-indexed so they line up — but the *printed* page numbers on a PDF (e.g. "Page 1" in the footer) may differ from the actual PDF page index if there's a cover page, blank pages, or front matter. Use `pdfinfo` to check the total page count and verify alignment.

This bypasses text extraction entirely and lets the LLM interpret the page visually.

## Script Reference

`extract.py` arguments:

| Flag | Description |
|------|-------------|
| `<pdf>` | Path to the PDF file (required) |
| `-o`, `--output` | Write output to file instead of stdout |
| `--pages` | Page ranges, e.g. `1-5,10,12-15` (1-indexed) |
| `--text` | Strip Markdown formatting, output plain text |
| `--info` | Show metadata (title, author, page count) only |
| `--legacy` | Use legacy extraction mode (often better for visually complex PDFs) |
| `--dpi` | Resolution for image processing (default: 150) |
| `--force-text` | Output text even on image backgrounds (default: on) |
