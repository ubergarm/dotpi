FROM debian:bookworm-slim

ARG BUILD_UID=1000
ARG BUILD_GID=1000

RUN apt-get update && apt-get install -y --no-install-recommends \
    libgcc-s1 \
    libstdc++6 \
    ripgrep \
    fd-find \
    git \
    curl \
    build-essential \
    cmake \
    ca-certificates \
    fonts-dejavu-extra \
    && rm -rf /var/lib/apt/lists/*

RUN curl -fsSL https://nodejs.org/dist/v22.14.0/node-v22.14.0-linux-x64.tar.gz | tar xz --strip-components=1 -C /usr/local

RUN groupadd -g "$BUILD_GID" appgroup && \
    useradd -u "$BUILD_UID" -g "$BUILD_GID" -m -d /home/app appuser

ENV HOME=/home/app

# XDG Base Directory overrides - all data stays in /app/.opencode/ bind mount
#ENV XDG_DATA_HOME=/app/.opencode/data
#ENV XDG_CONFIG_HOME=/app/.opencode/config
#ENV XDG_CACHE_HOME=/app/.opencode/cache
#ENV XDG_STATE_HOME=/app/.opencode/state

# pi-specific configuration
ENV PI_CODING_AGENT_DIR=/app/pi/.pi/agent

WORKDIR /app/
USER appuser

ENTRYPOINT ["/usr/bin/bash"]
