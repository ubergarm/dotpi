#!/usr/bin/env python3
"""Transcribe audio/video files using faster-whisper with multiple output formats."""

import argparse
import json
import sys
from pathlib import Path

from faster_whisper import WhisperModel


def load_model(model_name: str, device: str, compute_type: str) -> WhisperModel:
    """Load the whisper model, auto-detecting GPU availability."""
    # Try CUDA first if device is not explicitly cpu
    if device == "cuda":
        try:
            print(f"Loading {model_name} on CUDA...", file=sys.stderr)
            return WhisperModel(
                model_name,
                device="cuda",
                device_index=0,
                compute_type=compute_type,
            )
        except Exception as e:
            print(f"CUDA unavailable ({e}), falling back to CPU...", file=sys.stderr)
            device = "cpu"

    cpu_compute = "int8" if compute_type == "float16" else compute_type
    print(f"Loading {model_name} on CPU...", file=sys.stderr)
    return WhisperModel(
        model_name,
        device="cpu",
        compute_type=cpu_compute,
    )


def transcribe(model, audio_path: str, language: str | None, beam_size: int, word_timestamps: bool):
    """Run transcription and return segments with optional word-level timestamps."""
    print(f"Transcribing: {audio_path}", file=sys.stderr)
    if language:
        print(f"Language: {language}", file=sys.stderr)

    segments_info, info = model.transcribe(
        audio_path,
        language=language,
        beam_size=beam_size,
        word_timestamps=word_timestamps,
        vad_filter=True,  # Remove silent gaps
    )

    detected_lang = info.language if info.language_probability > 0.5 else None
    if detected_lang and not language:
        print(f"Detected language: {detected_lang} ({info.language_probability:.0%})", file=sys.stderr)

    segments = list(segments_info)
    return segments, info


def format_txt(segments) -> str:
    """Plain text output."""
    return " ".join(seg.text.strip() for seg in segments)


def format_srt(segments) -> str:
    """SRT subtitle format."""
    lines = []
    for i, seg in enumerate(segments, 1):
        start = format_time_srt(seg.start)
        end = format_time_srt(seg.end)
        lines.append(f"{i}\n{start} --> {end}\n{seg.text.strip()}\n")
    return "\n".join(lines)


def format_vtt(segments) -> str:
    """WebVTT subtitle format."""
    lines = ["WEBVTT\n"]
    for seg in segments:
        start = format_time_vtt(seg.start)
        end = format_time_vtt(seg.end)
        lines.append(f"{start} --> {end}\n{seg.text.strip()}\n")
    return "\n".join(lines)


def format_json(segments) -> str:
    """JSON with word-level timestamps."""
    words = []
    for seg in segments:
        if seg.words:
            for word_info in seg.words:
                words.append({
                    "word": word_info.word.strip("-"),
                    "start": round(word_info.start, 3),
                    "end": round(word_info.end, 3),
                    "probability": round(word_info.probability, 4) if word_info.probability else None,
                })
        else:
            words.append({
                "text": seg.text.strip(),
                "start": round(seg.start, 3),
                "end": round(seg.end, 3),
            })
    return json.dumps(words, indent=2)


def format_ass(segments) -> str:
    """ASS subtitle format with karaoke-style word highlighting."""
    header = """[Script Info]
Title: Whisper Transcription
ScriptType: v4.00+
WrapStyle: 0
PlayResX: 1920
PlayResY: 1080

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default, Arial, 48,&H00FFFF00,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,4,2,2,20,20,120,1
Style: Inactive, Arial, 48,&H00888888,&H000000FF,&H00000000,&H80000000,1,0,0,0,100,100,0,0,1,4,2,2,20,20,120,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    events = []
    for seg in segments:
        if seg.words:
            for word_info in seg.words:
                word = word_info.word.strip("-").replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")
                if not word:
                    continue
                start = f"{word_info.start:.2f}"
                end = f"{word_info.end:.2f}"
                events.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{{{word}}}")
        else:
            text = seg.text.strip().replace("\\", "\\\\").replace("{", "\\{").replace("}", "\\}")
            start = f"{seg.start:.2f}"
            end = f"{seg.end:.2f}"
            events.append(f"Dialogue: 0,{start},{end},Default,,0,0,0,,{{{text}}}")

    return header + "\n".join(events)


def format_time_srt(seconds: float) -> str:
    """Format seconds as SRT timestamp: HH:MM:SS,mmm"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def format_time_vtt(seconds: float) -> str:
    """Format seconds as VTT timestamp: HH:MM:SS.mmm"""
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    ms = int((seconds % 1) * 1000)
    return f"{h:02d}:{m:02d}:{s:02d}.{ms:03d}"


FORMATTERS = {
    "txt": format_txt,
    "srt": format_srt,
    "vtt": format_vtt,
    "json": format_json,
    "ass": format_ass,
}


def main():
    parser = argparse.ArgumentParser(
        description="Transcribe audio/video with Whisper (faster-whisper backend)"
    )
    parser.add_argument("audio", help="Input audio/video file path")
    parser.add_argument(
        "--format", "-f",
        choices=list(FORMATTERS.keys()),
        default="txt",
        help="Output format (default: txt)",
    )
    parser.add_argument(
        "--language", "-l",
        default=None,
        help="Force language code (e.g. en, es, ja). Auto-detected if omitted.",
    )
    parser.add_argument(
        "--device", "-d",
        choices=["cuda", "cpu"],
        default="cuda",
        help="Device to use (default: cuda, falls back to cpu)",
    )
    parser.add_argument(
        "--compute-type",
        default="float16",
        choices=["float16", "int8", "int8_float16"],
        help="Compute precision (default: float16)",
    )
    parser.add_argument(
        "--model", "-m",
        default="large-v3",
        help="Model size: large-v3 (default), medium, small, base, tiny",
    )
    parser.add_argument(
        "--beam-size",
        type=int,
        default=5,
        help="Beam search size (default: 5)",
    )
    parser.add_argument(
        "--no-timestamps",
        action="store_true",
        help="Disable word-level timestamps (faster, no per-word output)",
    )
    parser.add_argument(
        "--output", "-o",
        default=None,
        help="Write output to file instead of stdout",
    )

    args = parser.parse_args()

    if not Path(args.audio).exists():
        print(f"Error: File not found: {args.audio}", file=sys.stderr)
        sys.exit(1)

    # Map model name to HF repo
    model_map = {
        "large-v3": "Systran/faster-whisper-large-v3",
        "large-v2": "Systran/faster-whisper-large-v2",
        "medium": "Systran/faster-whisper-medium",
        "small": "Systran/faster-whisper-small",
        "base": "Systran/faster-whisper-base",
        "tiny": "Systran/faster-whisper-tiny",
    }
    model_path = model_map.get(args.model, args.model)

    model = load_model(model_path, args.device, args.compute_type)
    segments, info = transcribe(
        model, args.audio, args.language, args.beam_size,
        word_timestamps=not args.no_timestamps
    )

    formatter = FORMATTERS[args.format]
    output = formatter(segments)

    if args.output:
        Path(args.output).write_text(output, encoding="utf-8")
        print(f"Written to {args.output}", file=sys.stderr)
    else:
        print(output)


if __name__ == "__main__":
    main()
