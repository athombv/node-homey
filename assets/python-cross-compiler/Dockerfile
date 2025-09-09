FROM node:18-bullseye-slim

# Add uv for Python management
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Add build-essential packages so non-python parts of packages can be build
RUN apt update
RUN apt install -y build-essential

# Set uv up for running in containers
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

# Configure the Python directory so it is consistent
ENV UV_PYTHON_INSTALL_DIR=/python

# Only use the managed Python version
ENV UV_MANAGED_PYTHON=1

# Install the supported Python versions as managed by uv
RUN uv python install 3.13 --default

COPY --chmod=777 setup.sh /

WORKDIR /app

CMD ["bash", "/setup.sh"]
