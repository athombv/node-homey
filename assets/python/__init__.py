"""This module makes the App-folder a package, and imports the local python packages."""

import sys
import os
import platform

# TODO: Below solution is not very clean, but works good enough for now.
# THe best scenario would be to only send the correct python_packages folder with the App, and rename it to "python_packages" without the platform post-fix
arch = platform.machine().lower()
if arch in ['amd64', 'x86_64']:
    arch = 'amd64'
elif arch in ['arm64', 'aarch64']:
    arch = 'arm64'

# Enable local python_packages
# This is necessary to add the bundled python packages to python
# We used a bundled python_packages folder, send with the App, to ensure the same version is used all the time
# This also saves time on installation AND prevents dependency on PyPI or the internet (other than the Homey App Store)

# NOTE: This __init__.py is called every time something is imported from this package. Therefore, we NEED to check if this entry already exists in sys.path
packages_path =  os.path.join(os.path.dirname(__file__), f'python_packages_manylinux_{arch}')
if packages_path not in sys.path:
    sys.path.insert(0, packages_path)