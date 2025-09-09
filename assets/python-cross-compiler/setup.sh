ARCH=$(uname -m);
if [ "$ARCH" != "aarch64" ]; then
  echo "Cross-compilation should be done on aarch64." >&2;
  echo "To enable aarch64 emulation make sure you use containerd:" >&2;
  echo "https://docs.docker.com/build/building/multi-platform/#prerequisites" >&2;
  echo "You may also need to install/register QEMU:" >&2;
  echo "https://docs.docker.com/build/building/multi-platform/#install-qemu-manually" >&2;
  exit 1;
fi

echo "Cross-compiling"

export UV_COMPILE_BYTECODE=1
export UV_LINK_MODE=copy
export UV_PYTHON_INSTALL_DIR=/python
export UV_CACHE_DIR=/uv_cache
export UV_MANAGED_PYTHON=1

uv venv --allow-existing --no-python-downloads --relocatable &&
uv sync --no-dev &&

# Remove links to the Python binaries, as they will break outside the container
rm .venv/bin/python &&
rm .venv/bin/python[0-9]*;
