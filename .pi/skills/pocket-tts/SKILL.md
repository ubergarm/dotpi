---
name: pocket-tts
description: >
  Generate speech locally using the pocket-tts CLI. Defaults to the `fantine` voice;
  use `stuart_bell` when a second voice is needed.
---

# Pocket TTS

Generate speech locally via the `pocket-tts` CLI — no server required.

## Setup

All commands below run from `pocket-tts` using the project venv. Activate it once:

```bash
cd /app/pocket-tts
source venv/bin/activate
```

Or use the venv binary directly:

```bash
/app/pocket-tts/venv/bin/pocket-tts generate --text "Hello world!" --voice fantine
```

## Voice defaults

- **Primary voice:** `fantine` (use this unless a different voice is explicitly requested)
- **Second voice:** `stuart_bell` (use when two distinct voices are needed, e.g. dialogue)

## Basic usage

(Run after `cd /app/pocket-tts && source venv/bin/activate`)

```bash
# Single voice (default: fantine)
pocket-tts generate --text "Hello world!" --voice fantine

# Output goes to ./tts_output.wav by default. Specify a path with --output-path.
pocket-tts generate --text "Hello world!" --voice fantine --output-path greeting.wav
```

## Play the output

Save to a file and play with `pw-play`:

```bash
pocket-tts generate --text "Hello world!" --voice fantine --output-path greeting.wav
pw-play greeting.wav
```

## Radio-style audio mastering with ffmpeg

When live playback is requested, run the raw TTS output through a broadcast-style mastering chain using ffmpeg audio filters. This declicks, shapes bandwidth, adds warmth and presence, controls sibilance, glues dynamics, and normalizes to podcast loudness standards.

```bash
pocket-tts generate --text "Hello world!" --voice fantine --output-path /tmp/raw.wav
ffmpeg -y -i /tmp/raw.wav -af "\
adeclick=threshold=4,\
highpass=f=80,\
lowpass=f=11000,\
equalizer=f=200:width_type=q:width=1.5:gain=3,\
equalizer=f=3500:width_type=q:width=1.5:gain=2.5,\
deesser=i=0.4:m=0.5:f=0.25,\
acompressor=threshold=0.063:ratio=3:attack=3:release=100:makeup=1,\
alimiter=limit=0.891:attack=5:release=50,\
loudnorm=I=-16:LRA=11:TP=-1.5" \
-ar 24000 /tmp/mastered.wav
pw-play /tmp/mastered.wav
```

### Filter chain breakdown

| Step | Filter | Purpose | Notes |
|------|--------|---------|-------|
| 1 | `adeclick=threshold=4` | Remove impulsive pops/clicks (TTS artifacts) | Default `threshold=2` is too aggressive for TTS (flags ~5% of samples); `4` catches real artifacts without over-processing |
| 2 | `highpass=f=80` | Cut sub-bass rumble | 80 Hz keeps voice fundamental intact |
| 3 | `lowpass=f=11000` | Remove ultrasonic harshness | For 24 kHz source audio (Nyquist = 12 kHz); raise to ~15 kHz if source is 44.1/48 kHz |
| 4 | `equalizer` (×2) | Tonal EQ — warmth + presence | 200 Hz boost adds body; 3.5 kHz boost adds intelligibility. Use `anequalizer` for a multi-band parametric alternative |
| 5 | `deesser` | Tame sibilance (`s`/`sh` sounds) | `f=0.25` = 6 kHz at 24 kHz sample rate; scales with input SR |
| 6 | `acompressor` | Radio-style dynamic-range glue | `threshold=0.063` ≈ −24 dB, 3:1 ratio, fast attack/release |
| 7 | `alimiter` | Brickwall peak limiter | `limit=0.891` ≈ −1 dBFS; safety net before loudness normalization |
| 8 | `loudnorm` | EBU R128 loudness normalization | Targets podcast/streaming standard: −16 LUFS, −1.5 dBTP true peak |

> **Note:** pocket-tts writes a WAV header claiming ~2 GB of data while the actual audio is only a few seconds. ffmpeg processes the real audio correctly but prints a `corrupt input packet` warning — this is harmless. The `-ar 24000` preserves the original sample rate; omit or change to `-ar 44100` if your playback setup prefers it.

## Two-voice dialogue

Generate separate clips for each voice and concatenate:

```bash
pocket-tts generate --text "Hello there!" --voice fantine --output-path line1.wav
pocket-tts generate --text "Hi, how are you?" --voice stuart_bell --output-path line2.wav
ffmpeg -i line1.wav -i line2.wav -filter_complex "concat=n=2:v=0:a=1" dialogue.wav
pw-play dialogue.wav
```

## Generate from stdin

Pass text via stdin when the content is in a file or variable:

```bash
echo "This is a long passage of text." | pocket-tts generate --voice fantine
```

## Options summary

| Option | Description |
|--------|-------------|
| `--text TEXT` | Text to synthesize (or read from stdin) |
| `--voice TEXT` | Voice name (`fantine` default, `stuart_bell` for second voice) |
| `--output-path TEXT` | Output WAV path (default `./tts_output.wav`; use `-` for stdout) |
| `--language TEXT` | Model language (default `english`) |
| `--temperature FLOAT` | Generation temperature (default `0.7`) |
| `--quiet` / `-q` | Suppress logging output |
| `--quantize` | Apply int8 quantization to reduce memory |
| `--device TEXT` | Device to use (default `cpu`) |

## Notes

- First run downloads model weights from HuggingFace Hub and caches them.
- Prefer file-based playback via the ffmpeg mastering chain → `pw-play` when live playback is requested.
- Use the ffmpeg filter stack for broadcast-style cleanup and loudness normalization before playback.
