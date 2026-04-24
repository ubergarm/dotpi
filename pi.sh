#!/usr/bin/env bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

export PI_CODING_AGENT_DIR="${SCRIPT_DIR}/.pi"
node '/app/pi/node_modules/@mariozechner/pi-coding-agent/dist/cli.js'
