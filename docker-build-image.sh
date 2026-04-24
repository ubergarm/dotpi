#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

BUILD_UID=$(id -u)
BUILD_GID=$(id -g)

docker build \
    --build-arg BUILD_UID="$BUILD_UID" \
    --build-arg BUILD_GID="$BUILD_GID" \
    -t "pi:latest" \
    -f Dockerfile \
    .
