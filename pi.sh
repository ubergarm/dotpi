#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

export PI_CODING_AGENT_DIR="${SCRIPT_DIR}/.pi"
if [ -f "${SCRIPT_DIR}/.pi/skills/web-search/.venv/bin/activate" ]; then
    source "${SCRIPT_DIR}/.pi/skills/web-search/.venv/bin/activate"
fi
node '/app/pi/node_modules/@mariozechner/pi-coding-agent/dist/cli.js'
