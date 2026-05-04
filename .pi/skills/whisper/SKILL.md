---
name: whisper
description: >
  Transcribe audio/video files to text using OpenAI Whisper (faster-whisper backend).
  Supports word-level timestamps, multiple output formats (srt, vtt, json, txt, ass),
  auto language detection, and GPU acceleration. Use when transcribing audio, creating
  subtitles/captions, or extracting text from spoken content.
---

# Whisper Transcription

Local speech-to-text powered by [faster-whisper](https://github.com/SYSTRAN/faster-whisper) with the `large-v3` model (~2.9 GB, pre-cached in HuggingFace cache).

## Setup

All commands below run from `.pi/skills/whisper` using `uv run`. The venv should already exist.
If a command fails because it's missing, create it once:

```bash
uv venv .venv --relocatable --python 3.13 --python-preference=only-managed
uv sync
```

## Transcribe an Audio File

```bash
uv run python transcribe.py audio.mp3
```

### Output Formats

By default, prints plain text to stdout. Use `--format` for structured output:

```bash
# SRT subtitles (for video players)
uv run python transcribe.py audio.mp3 --format srt > subtitles.srt

# VTT subtitles (for web players)
uv run python transcribe.py audio.mp3 --format vtt > subtitles.vtt

# JSON with word-level timestamps
uv run python transcribe.py audio.mp3 --format json > transcript.json

# Plain text (no timestamps)
uv run python transcribe.py audio.mp3 --format txt > transcript.txt

# ASS subtitles (for ffmpeg ASS filter — karaoke-style captions)
uv run python transcribe.py audio.mp3 --format ass > subtitles.ass
```

### Supported Input Formats

Any audio/video format supported by ffmpeg: `mp3`, `wav`, `flac`, `m4a`, `ogg`, `mp4`, `mkv`, `webm`, etc.

### Language

Auto-detected by default. Override with `--language`:

```bash
uv run python transcribe.py audio.mp3 --language es
uv run python transcribe.py audio.mp3 --language ja
```

Supported languages: `en`, `es`, `fr`, `de`, `ja`, `zh`, `ko`, `ru`, `pt`, `ar`, `hi`, and 90+ more.

### GPU Acceleration

Automatically uses CUDA GPU if available (requires NVIDIA GPU + drivers + `--gpus all` in docker-run.sh).
Force CPU with `--device cpu`:

```bash
uv run python transcribe.py audio.mp3 --device cuda
uv run python transcribe.py audio.mp3 --device cpu
```

### Speed vs Quality

The model uses `large-v3` by default. For faster (less accurate) results, pass `--model medium`, `--model small`, `--model base`, or `--model tiny`. The large-v3 model is pre-cached; other models download on first use.

### Word-level Timestamps

The `json` output includes per-word start/end times, useful for karaoke-style captioning:

```json
[
  {"word": "Hello", "start": 0.0, "end": 0.38, "probability": 0.99},
  {"word": "world", "start": 0.38, "end": 0.72, "probability": 0.97}
]
```

### Burning Subtitles into a Video

Combine with ffmpeg to burn SRT/VTT/ASS subtitles:

```bash
# Generate subtitles
uv run python transcribe.py audio.mp3 --format srt > subtitles.srt

# Burn into video
ffmpeg -i video.mp4 -vf "subtitles=subtitles.srt" output.mp4
```

## Options

Run with `--help` for all options:

| Option | Description |
|--------|-------------|
| `--format` | Output format: `txt` (default), `srt`, `vtt`, `json`, `ass` |
| `--language` | Force language code (e.g. `en`, `es`). Auto-detected if omitted |
| `--device` | `cuda` (default, auto-detects) or `cpu` |
| `--compute-type` | Precision: `float16` (default), `int8`, `int8_float16` |
| `--model` | Model size: `large-v3` (default), `medium`, `small` |
| `--beam-size` | Beam search size (default `5`) |
| `--no-timestamps` | Disable word-level timestamps (faster, no per-word output) |
| `--output` | Write to file instead of stdout |
