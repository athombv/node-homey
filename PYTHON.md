> [!WARNING]  
> This documentation is NOT final. it should be enough for a developer to 
> work on the CLI, but it is not good enough to make public yet.

# Python implementation

Including Python in this CLI makes the process much more complex. 
This file should explain the most important parts of it.

## "`--python`" option

All commands starting with "`homey app...`" will be able to use the "`--python`" option to tell the CLI which Python binary/executable to use.
By default it uses "python" as the binary, but this binary can be of any version. Homey requires version 3.13, so we made it able to specify the correct binary, without touching the global binary.

> Example: \
> "`homey app pip install requests --python /usr/local/lib/python3.13`"

It tests the python version by performing:
"`<binary/executable> --version`", which should output version 3.13.x

## Commands

There are a few new commands added to the CLI, this is for package management.

- **`homey app pip install`**:
    Install all packages defined in the "`app.json`" manifest file. (Useful when using Version Control Systems like Git.) (The "`.homeyenv`" is not share-able across systems, but "`app.json`" is.)
- **`homey app pip install [packages...]`**:
    Install one or more packages.
- **`homey app pip uninstall [packages...]`**:
    Uninstall one or more packages. (WARN: because we still use pip, uninstalling a dependency will not uninstall its sub-dependencies) (TODO: Fix this, and also uninstall sub-dependencies)
- **`homey app pip list`**:
    List all installed packages straight from the "`app.json`" manifest.
- **`homey app pip sync`**:
    Manually synchronize actual installed packages with "`app.json`" manifest. This should not be necessary, as this synchronization is ran on both 'install' and 'uninstall' commands.

## Use of Local python

The local Python interpreter is used for two reasons:

1. To create a [Virtual Environment](https://packaging.python.org/en/latest/guides/installing-using-pip-and-virtual-environments/) for your Homey App Project.

2. To [let the code-editor use](https://code.visualstudio.com/docs/python/environments) this interpreter for autocompletion.

## Use of Docker Python

Besides the Local Python, we also use Python inside a [Docker container](https://www.docker.com/). This is for the following actions:

1. **Package management**:
    The Homey CLI uses Docker to install, uninstall and read packages for Python. Inside this Docker container, we have control over the environment. This makes it possible for us to control the Python and Pip versions. This also allows us to switch to another Package Manager in the future, without you noticing.

    For now we use the standard package manager 'pip'. But we may switch to 'uv', 'poetry' or an other alternative in the future. (because of speed, efficiency and/of lock-files)

    This is triggered on the following commands:
    - `homey app pip install`
    - `homey app pip install [packages...]`
    - `homey app pip uninstall [packages...]`
    - `homey app pip sync` (Need package manager inside Docker to display a correct list of installed packages.) 
    <b style="color: red;">(TODO: This currently still uses local pip (from virtual environment))</b>


2. **Cross-compiling**:
    The Homey CLI uses a cross-compiling technique to build the pip-packages for both ARM64 and AMD64 "manylinux" architectures. Docker needs [QEMU](https://docs.docker.com/build/building/multi-platform/#qemu) emulation to work correctly.

    This is triggered on the following commands:
    - `homey app build` (Both ARM64 and AMD64)
    - `homey app run` (ARM64 or AMD64 (based on system))
    - `homey app install` (ARM64) <b style="color: red;">(TODO: Both ARM64 and AMD64)</b>




