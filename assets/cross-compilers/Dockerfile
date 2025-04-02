# Usage:
# Run cross-compiler from the Homey CLI, with options:
# - Bind the requirements.txt to the host ('/compilation/requirements.txt')
# - Bind the result directory to the host ('/compilation/python_packages')
# - Optional: Bind the pip-cache to the host, to have more efficient builds. ('/home/pip_user/.cache/pip')
# - Define the platform to build for, e.g. --platform linux/arm64 or --platform linux/amd64 (undefined will use the host platform)
#
# We only support 2 platforms: 
# - manylinux_amd64: Optionally local development
# - manylinux_arm64: Homey Pro 2023, Homey Cloud & Optionally local development
#
# Before building, we need to install QEMU:
# See: https://docs.docker.com/build/building/multi-platform/#install-qemu-manually
# Or: `docker run --privileged --rm tonistiigi/binfmt --install all`
# 
# To see supported platforms, run:
# `docker buildx inspect --bootstrap`
# WARN: This inspect should show at least 2 platforms: linux/arm64 and linux/amd64
#
# To build a local image for testing, perform the following command:
# `docker buildx build --load --platform linux/amd64,linux/arm64 -t athombv/homey-apps-sdk-v3-cross-compiler:local .`
# OR (when docker does weird, we explicitly define it (I ended with this option))
# `docker buildx build --load --platform linux/arm64 -t athombv/homey-apps-sdk-v3-cross-compiler-arm64:local .` &
# `docker buildx build --load --platform linux/amd64 -t athombv/homey-apps-sdk-v3-cross-compiler-amd64:local .`
# (The --load is required to receive the image in your local docker-registry)
#
# Now edit the /lib/PythonCommands.js to use the 'athombv/homey-apps-sdk-v3-cross-compiler:local' image.
#
# Known issue: 'qemu: uncaught target signal 11 (Segmentation fault) - core dumped'
# Workaround: `docker run --rm --privileged multiarch/qemu-user-static --reset -p yes -c yes`
# ref: https://github.com/docker/for-win/issues/14011
#

FROM python:3.13.3-slim-bullseye

# Disable pip version check, because it looks unprofessional when it says 'outdated'. (outdated is fine in Docker)
ENV PIP_DISABLE_PIP_VERSION_CHECK=true
# Disable warnings about 'already existing' files. i = ignore
ENV PIP_EXISTS_ACTION=i
# Disable buffer for stdout and stderr. Works better in short-term docker images.
ENV PYTHONUNBUFFERED='1'
# Disable root warnings (Reason for this warning does not apply for a defined target directory ('-t /python_packages'): https://github.com/pypa/pip/issues/6409)
ENV PIP_ROOT_USER_ACTION=ignore

# Install build dependencies
RUN apt-get update
RUN apt-get install build-essential -y

# Run the App
CMD ["python", "-m", "pip", "install", "-r", "requirements.txt", "-t", "./python_packages"]
