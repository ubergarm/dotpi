#!/bin/bash
set -e

LOCAL_UV="$HOME/.local/bin/uv"
LOCAL_UV_CACHE="$(uv cache dir)"
LOCAL_UV_PYTHON="$(uv python dir)"

docker run --rm -it \
    --user "$(id -u):$(id -g)" \
    --network=host \
    -v "$(pwd):/app/:rw" \
    -v "$LOCAL_UV:/usr/bin/uv:ro" \
    -v "$LOCAL_UV_PYTHON:/home/job/.local/share/uv/python/:ro" \
    -v "$LOCAL_UV_CACHE:/home/job/.cache/uv/" \
    -v "$LOCAL_UV_PYTHON:/home/garm/.local/share/uv/python/:ro" \
    -e "TERM" \
    -e "COLORTERM" \
    -e "PI_CODING_AGENT_DIR=/app/pi/.pi/agent" \
    -e "XDG_RUNTIME_DIR=/run/user/$(id -u)" \
    -v "/run/user/$(id -u)/pipewire-0:/run/user/$(id -u)/pipewire-0" \
    --entrypoint /bin/bash \
    pi:latest "$@"
