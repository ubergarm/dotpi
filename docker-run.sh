#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

LOCAL_UV="$HOME/.local/bin/uv"
LOCAL_UV_CACHE="$(uv cache dir)"
LOCAL_UV_PYTHON="$(uv python dir)"

docker run --rm -it \
    --user "$(id -u):$(id -g)" \
    --network=host \
    -v "$SCRIPT_DIR:/app/:rw" \
    -v "$LOCAL_UV:/usr/bin/uv:ro" \
    -v "$LOCAL_UV_PYTHON:/home/app/.local/share/uv/python/:ro" \
    -v "$LOCAL_UV_CACHE:/home/app/.cache/uv/" \
    -v "$LOCAL_UV_PYTHON:/home/garm/.local/share/uv/python/:ro" \
    -e "TERM" \
    -e "COLORTERM" \
    -e "PI_CODING_AGENT_DIR=/app/pi/.pi/agent" \
    --entrypoint /bin/bash \
    pi:latest "$@"
