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
    jq \
    sudo \
    build-essential \
    cmake \
    ca-certificates \
    fonts-dejavu-extra \
    pipewire-bin \
    xxd \
    bsdextrautils \
    file \
    binutils \
    bind9-dnsutils \
    iproute2 \
    iputils-ping \
    wget \
    socat \
    netcat-openbsd \
    openssh-client \
    procps \
    psmisc \
    strace \
    ltrace \
    tcpdump \
    unzip \
    zip \
    bzip2 \
    sqlite3 \
    bc \
    tldr \
    man-db \
    && rm -rf /var/lib/apt/lists/*

# Fetch latest LTS Node.js version dynamically at build time from index.json
RUN NODE_VERSION=$(curl -s https://nodejs.org/dist/index.json | jq -r '[.[] | select(.lts != null)] | sort_by(.date) | reverse | .[0].version | ltrimstr("v")') && \
    curl -fsSL "https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.gz" | tar xz --strip-components=1 -C /usr/local

RUN groupadd -g "$BUILD_GID" appgroup && \
    useradd -u "$BUILD_UID" -g "$BUILD_GID" -m -d /home/job job && \
    echo 'job ALL=(ALL) NOPASSWD:ALL' > /etc/sudoers.d/job

ENV HOME=/home/job

# XDG Base Directory overrides - all data stays in /app/.opencode/ bind mount
#ENV XDG_DATA_HOME=/app/.opencode/data
#ENV XDG_CONFIG_HOME=/app/.opencode/config
#ENV XDG_CACHE_HOME=/app/.opencode/cache
#ENV XDG_STATE_HOME=/app/.opencode/state

# pi-specific configuration
ENV PI_CODING_AGENT_DIR=/app/pi/.pi/agent

WORKDIR /app/
USER job

ENTRYPOINT ["/usr/bin/bash"]
