#!/bin/bash
set -e

BUILD_UID=$(id -u)
BUILD_GID=$(id -g)

docker build \
    --build-arg BUILD_UID="$BUILD_UID" \
    --build-arg BUILD_GID="$BUILD_GID" \
    -t "pi:latest" \
    -f Dockerfile \
    .
