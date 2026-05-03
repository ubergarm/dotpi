---
name: pocket-tts
description: >
  Generate speech locally using the pocket-tts CLI. Defaults to the `fantine` voice;
  use `stuart_bell` when a second voice is needed.
---

# Pocket TTS

Generate speech locally via the `pocket-tts` CLI — no server required.

## Voice defaults

- **Primary voice:** `fantine` (use this unless a different voice is explicitly requested)
- **Second voice:** `stuart_bell` (use when two distinct voices are needed, e.g. dialogue)

## Basic usage

```bash
# Single voice (default: fantine)
pocket-tts generate --text "Hello world!" --voice fantine

# Output goes to ./tts_output.wav by default. Specify a path with --output-path.
pocket-tts generate --text "Hello world!" --voice fantine --output-path greeting.wav
```

## Play the output

Pipe the generated WAV through `pw-play` for immediate playback:

```bash
pocket-tts generate --text "Hello world!" --voice fantine --output-path - | pw-play --stdin
```

Or play a file directly:

```bash
pw-play greeting.wav
```

## Audio cleanup with sox

When live playback is requested, stream through sox for cleanup — normalize, compress, and noise-reduce before sending to `pw-play`:

```bash
pocket-tts generate --text "Hello world!" --voice fantine --output-path - \
  | sox -t wav - -t wav - norm -3 compand 0.02,1 -70 -60,-60 -60,-20 0.1 \
  | pw-play --stdin
```

For file-based cleanup (e.g. before saving or concatenating):

```bash
sox input.wav output.wav norm -3 compand 0.02,1 -70 -60,-60 -60,-20 0.1
```

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
- Prefer streaming through sox → `pw-play --stdin` when live playback is requested.
- Use sox for normalize/compress/noise-reduce cleanup before playback.
