FROM mcr.microsoft.com/devcontainers/base:trixie

SHELL ["/bin/bash", "-l", "-c"]

# Install essential packages
RUN rm -rf /var/lib/apt/lists/* && \
    apt-get clean && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get upgrade -y && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y \
        build-essential \
        libssl-dev \
        zlib1g-dev \
        libbz2-dev \
        libreadline-dev \
        libsqlite3-dev \
        libffi-dev \
        liblzma-dev \
        curl \
        git \
        jq \
        vim \
        netcat-openbsd \
        socat && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*
