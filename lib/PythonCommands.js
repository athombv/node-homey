'use strict';

const path = require('path');
const util = require('util');
const stream = require('stream');
const fs = require('fs');
const os = require('os');
const childProcess = require('child_process');
const performance = require('perf_hooks').performance;

const Log = require('./Log');
const DockerHelper = require('./DockerHelper');
const Settings = require('../services/Settings');
const { HOMEY_PLATFORMS } = require('./constants');
const AppPython = require('./AppPython');

const statAsync = util.promisify(fs.stat);
const exec = util.promisify(childProcess.exec);

class PythonCommands {

  /**
   * Install package with pip (inside docker container to have more control over the environment).
   * @param {string | string[]} packageName
   * @param {object} config
   * @param {string} config.appPath
   * @param {string} config.executable
   */
  static async pipInstall(packageName, { constrainsTxt = undefined, appPath, executable }) {
    // We perform pip install inside a docker container.

    // Still allow local packages inside docker container
    // By mounting them inside docker
    const localMounts = [];
    if (typeof packageName === 'string' && fs.existsSync(packageName)) {
      const basename = path.basename(packageName);
      localMounts.push(`${packageName}:/homey_mounts/${basename}`);
      packageName = `/homey_mounts/${basename}`;
    } else if (Array.isArray(packageName)) {
      for (const requirement of packageName) {
        // TODO: Could error when directory exists with exact name of file. How to detect if it is a path?
        if (!fs.existsSync(requirement)) continue;
        const basename = path.basename(requirement);
        localMounts.push(`${requirement}:/homey_mounts/${basename}`);
        packageName[packageName.indexOf(requirement)] = `/homey_mounts/${basename}`;
      }
    }

    if (Array.isArray(packageName) && packageName.length === 1) {
      if (typeof packageName[0] === 'string') {
        packageName = packageName[0];
      }
    }

    // TODO: Add Homey Package Index
    // TODO: Add redirect for 'homey' to 'AppPython.addTypes'?
    if (typeof packageName === 'string') {
      Log.info(`Installing package "${packageName}"...`);
      await PythonCommands.venv.ensure(appPath, executable);
      const venvPython = await PythonCommands.venv.getPython(appPath);
      await this.ensurePython(venvPython);

      // Get the site-packages path
      let sitePackagesPath = await exec(`${venvPython} -c "import sysconfig; print(sysconfig.get_path('purelib'))"`, { cwd: appPath });
      sitePackagesPath = sitePackagesPath.stdout.trim();

      if (!fs.existsSync(sitePackagesPath)) {
        throw new Error('sitePackagesPath does not exist!');
      }

      const exitCode = await PythonCommands.pipCommandDocker({
        name: `homey-apps-sdk-v3-pip-installer-${Date.now()}`,
        WorkingDir: '/',
        args: [
          'install',
          `"${packageName}"`,
          '-c', '/homey/constrains.txt',
          ...(constrainsTxt ? ['-c', '/constrains.txt'] : []),
          '-t', 'python_packages',
          '--no-input',
          // `--upgrade` is necessary to be able to change 3.10 to 3.9 of package.
          // It should be avoided, but can be used because we use a constrains.txt to reinstall the exact versions.
          '--upgrade',
          // '-v',
        ],
        mounts: [
          `${path.join(__dirname, '..', 'assets', 'python', 'constrains.txt')}:/homey/constrains.txt`,
          `${sitePackagesPath}:/python_packages`,
          ...localMounts,
        ],
        constrainsTxt,
        cache: true,
      });

      if (exitCode !== 0) throw new Error(`Error while installing package "${packageName}"`);

      Log.success(`Successfully installed package "${packageName}".`);
    } else {
      if (packageName.length === 0) return;
      const displayedPackages = packageName.slice(0, Math.min(5, packageName.length)).map(i => `"${i}"`);
      Log.info(`Installing: ${displayedPackages.join(', ')} ${displayedPackages.length < packageName.length ? `& ${packageName.length - displayedPackages.length} more...` : ''}`);
      await PythonCommands.venv.ensure(appPath, executable);
      const venvPython = await PythonCommands.venv.getPython(appPath);
      await this.ensurePython(venvPython);

      // Get the site-packages path
      let sitePackagesPath = await exec(`${venvPython} -c "import sysconfig; print(sysconfig.get_path('purelib'))"`, { cwd: appPath });
      sitePackagesPath = sitePackagesPath.stdout.trim();

      if (!fs.existsSync(sitePackagesPath)) {
        throw new Error('sitePackagesPath does not exist!');
      }

      const exitCode = await PythonCommands.pipCommandDocker({
        name: `homey-apps-sdk-v3-pip-installer-${Date.now()}`,
        WorkingDir: '/',
        args: ['install', '-r', 'requirements.txt', '-c', '/constrains.txt', '-t', 'python_packages', '--no-input'],
        mounts: [
          `${path.join(__dirname, '..', 'assets', 'python', 'constrains.txt')}:/constrains.txt`,
          `${sitePackagesPath}:/python_packages`,
          ...localMounts,
        ],
        requirementsTxt: packageName.join('\r\n') || '',
        cache: true,
      });

      if (exitCode !== 0) throw new Error(`Error while installing "${packageName}" packages.`);

      Log.success(`Successfully installed ${packageName.length} packages.`);
    }
  }

  static async pipUninstall(packages, { appPath, executable }) {
    // Ensure it is always an array
    if (typeof packages === 'string') packages = [packages];

    await PythonCommands.venv.ensure(appPath, executable);
    const venvPython = await PythonCommands.venv.getPython(appPath);
    await this.ensurePython(venvPython);

    // Get the site-packages path
    let sitePackagesPath = await exec(`${venvPython} -c "import sysconfig; print(sysconfig.get_path('purelib'))"`, { cwd: appPath });
    sitePackagesPath = sitePackagesPath.stdout.trim();

    if (!fs.existsSync(sitePackagesPath)) {
      throw new Error('sitePackagesPath does not exist!');
    }

    const exitCode = await PythonCommands.pipCommandDocker({
      name: `homey-apps-sdk-v3-pip-uninstaller-${Date.now()}`,
      WorkingDir: '/',
      args: ['uninstall', '-r', '/requirements.txt', '-y'],
      mounts: [
        // We have to mount it to the local site-package, instead of './python_packages'.
        // This is because pip does not allow the '--target' option on 'pip uninstall'.
        `${sitePackagesPath}:/usr/local/lib/python3.13/site-packages`,
      ],
      requirementsTxt: packages.join('\r\n') || '',
      cache: true,
    });

    if (exitCode !== 0) throw new Error(`Error while uninstalling "${packages.length}" packages.`);

    Log.success(`Successfully uninstalled ${packages.length} packages.`);
  }

  /**
   * Execute a pip-command, with custom arguments.
   * @param {string[]} args Package name to uninstall (e.g. ['install', packageName, '-y'])
   */
  static async pipCommand(args, { appPath, executable }) {
    // 1. Ensure venv
    await PythonCommands.venv.ensure(appPath, executable);

    // 2. Pip uninstall package (in venv)
    let finishResolve = null;
    const finishPromise = new Promise(resolve => {
      finishResolve = resolve;
    });
    const installProcess = childProcess.spawn(PythonCommands.venv.getPip(appPath), args, {
      cwd: appPath,
      stdio: 'pipe',
    });
    installProcess.on('exit', code => {
      finishResolve(code);
    });
    // pip-feedback to user:
    installProcess.stdout.pipe(process.stdout);
    installProcess.stderr.pipe(process.stderr);

    return await finishPromise;
  }

  /**
   * Execute a pip-command in docker container, with custom arguments & mounts.
   * @param {object} config Package name to uninstall (e.g. ['install', packageName])
   * @param {string[]} config.args Package name to uninstall (e.g. ['install', packageName])
   * @param {string[]} config.mounts Docker mounts (e.g. '/path/to/requirements.txt:/requirements.txt')
   * @param {string[]} config.requirementsTxt Creates a '/requirements.txt' file with this string content
   * @param {string[]} config.constrainsTxt Creates a '/constrains.txt' file with this string content
   * @param {boolean} config.cache Whether to use pip-cache
   * @param {boolean} config.arch Architecture to run (undefined = auto detect (arm64 vs amd64))
   */
  static async pipCommandDocker(
    {
      name,
      WorkingDir = '/',
      args,
      mounts = [],
      requirementsTxt = undefined,
      constrainsTxt = undefined,
      cache = true,
      arch = undefined,
    },
  ) {
    const docker = await DockerHelper.ensureDocker();

    let platformData;
    if (arch === undefined) {
      platformData = process.arch === 'arm64' ? PythonCommands.PLATFORM_DATA.get(HOMEY_PLATFORMS.MANYLINUX_ARM64) : PythonCommands.PLATFORM_DATA.get(HOMEY_PLATFORMS.MANYLINUX_AMD64);
    } else {
      platformData = PythonCommands.PLATFORM_DATA.get(arch);
    }

    const cmd = [
      ...(requirementsTxt !== undefined ? ['echo', `"${requirementsTxt}"`, '>', '/requirements.txt', '&&'] : []),
      ...(constrainsTxt !== undefined ? ['echo', `"${constrainsTxt}"`, '>', '/constrains.txt', '&&'] : []),
      ...platformData.pipLocation,
      ...args,
    ];

    const dockerStream = new stream.PassThrough();
    dockerStream.pipe(process.stdout);
    return docker.run(platformData.image, ['sh', '-c', `${cmd.join(' ')}`], dockerStream, {
      name,
      WorkingDir,
      HostConfig: {
        AutoRemove: true,
        Binds: [
          ...mounts,
          ...(cache === true ? [
            `${path.join(Settings.getSettingsDirectory(), 'pip-cache')}:/root/.cache/pip`,
          ] : []),
        ],
      },
    }).then(([output, ...rest]) => {
      return output.StatusCode;
    });
  }

  /**
   * Retrieving all currently installed Python packages
   * @returns {Promise<string[]>} List of all requirement-lines
   */
  static async pipFreeze({ appPath, executable }) {
    await PythonCommands.venv.ensure(appPath, executable);
    const result = await exec(`${PythonCommands.venv.getPip(appPath)} freeze -l`);
    return result.stdout
      // Split on new lines (both "\r\n" and "\n" separators)
      .split('\r\n')
      .map(i => i.split('\n')).flat()
      // Ignore empty lines
      .filter(i => i)
      // Ignore our own package (TODO: Determine what behavior is preferred)
      .filter(i => !i.startsWith('homey_apps_sdk_v3-stubs'));
  }

  static venv = {
    folderName: '.homeyvenv',
    create: async (cwd, executable = 'python') => {
      await this.ensurePython(executable);
      Log.success(`Creating virtual environment at: ${PythonCommands.venv.folderName}/`);
      await exec(`${executable} -m venv ${PythonCommands.venv.folderName}`, { cwd });
      Log.success('Virtual environment created');
    },
    ensure: async (cwd, executable = 'python') => {
      const venvPath = path.join(cwd, PythonCommands.venv.folderName);

      const exists = await new Promise(resolve => {
        statAsync(venvPath)
          .then(() => resolve(true))
          .catch(() => resolve(false));
      });

      if (exists) return;

      await PythonCommands.venv.create(cwd, executable);

      const exists2 = await new Promise(resolve => {
        statAsync(venvPath)
          .then(() => resolve(true))
          .catch(() => resolve(false));
      });

      if (!exists2) throw new Error('Creating a virtual environment failed because of a unknown reason.');
    },
    getPip: cwd => {
      if (os.platform() === 'win32') {
        return path.join(cwd, PythonCommands.venv.folderName, 'Scripts', 'pip');
      }

      return path.join(cwd, PythonCommands.venv.folderName, 'bin', 'pip');
    },
    getPython: cwd => {
      if (os.platform() === 'win32') {
        return path.join(cwd, PythonCommands.venv.folderName, 'Scripts', 'python');
      }

      return path.join(cwd, PythonCommands.venv.folderName, 'bin', 'python');
    },
  }

  static async ensurePython(executable = 'python') {
    // Check if Python is installed
    const { stdout } = await exec(`${executable} --version`);
    if (!stdout) {
      throw new Error('Python is not installed. Please install Python to continue.');
    } else if (stdout.toLowerCase().includes('python 2')) {
      throw new Error('Python 2 is not supported. Please install Python 3.13 to continue.');
    } else if (!stdout.includes('3.13')) {
      throw new Error(`Python version "${stdout}" is not supported. Please install Python 3.13 to continue.`);
    }
  }

  static async copyIntoSitePackages(directory, { cwd, executable = undefined } = {}) {
    Log.success(`copying dependency: ${path.basename(directory)}`);

    await PythonCommands.venv.ensure(cwd, executable);

    const venvPython = await PythonCommands.venv.getPython(cwd);
    await this.ensurePython(venvPython);

    // Get the site-packages path
    let sitePackagesPath = await exec(`${venvPython} -c "import sysconfig; print(sysconfig.get_path('purelib'))"`, { cwd });
    sitePackagesPath = sitePackagesPath.stdout.trim();

    if (!fs.existsSync(sitePackagesPath)) {
      throw new Error('sitePackagesPath does not exist!');
    }

    fs.cpSync(directory, path.join(sitePackagesPath, path.basename(directory)), { recursive: true });

    Log.success('Installation complete');
  }

  // NOTE: We use custom images, instead of base images,
  // because we need some extra build-dependencies installed (e.g. build-essentials)
  // TODO: Publish container(s)
  static PLATFORM_DATA = new Map([
    [
      HOMEY_PLATFORMS.MANYLINUX_AMD64,
      {
        arch: 'linux/amd64',
        image: 'athombv/homey-apps-sdk-v3-cross-compiler-amd64:local',
        pipLocation: ['python3', '-m', 'pip'],
      },
    ],
    [
      HOMEY_PLATFORMS.MANYLINUX_ARM64,
      {
        arch: undefined, // 'linux/arm64',
        image: 'athombv/homey-apps-sdk-v3-cross-compiler-arm64:local',
        pipLocation: ['python3', '-m', 'pip'],
      },
    ],
  ]);

  /**
   * Cross compile python packages for a given target operating system and architecture.
   * @param {object} config
   * @param {string} config.buildPath - The path to the build directory.
   * @param {string} config.platform - The platform from 'AppPython.PLATFORM'
   */
  static async crossCompile({ buildPath, platform }) {
    Log.info('Cross compiling python packages...');
    const docker = await DockerHelper.ensureDocker();

    const platformData = PythonCommands.PLATFORM_DATA.get(platform);
    if (!platformData) throw new Error(`Platform ${platform} is not supported`);
    const platformImage = platformData.image;
    const platformArch = platformData.arch;

    Log.warning(`cross-compilation ${platform}. arch: ${platformArch} on image: ${platformImage}`);

    const cmd = [
      ...platformData.pipLocation,
      'install',
      '-r',
      'requirements.txt',
      '-t',
      'python_packages',
      // Uncomment the next two lines to test cross-compilation without wheels (actual compiling, instead of unpacking)
      // '--no-binary', ':all:',
      '--no-input',
    ];

    // pip cache is inside a custom path, so we ALWAYS know where to find it:
    // NOTE: "The exact filesystem structure of pip’s cache’s contents is considered to be an implementation detail and may change between any two versions of pip." - pip documentation
    const pipCacheDir = path.join(Settings.getSettingsDirectory(), 'pip-cache');
    const dockerStream = new stream.PassThrough();
    const dockerBuffer = [];
    dockerStream.on('readable', () => {
      dockerBuffer.push(dockerStream.read());
    });

    // I tried to make a clean wrapper, to only show the last 5 lines (and remove them when the stream ended)
    // But it is hard to track the amount of printed lines (and therefore lines to remove).
    // (issues: line breaks, line wrapping, line replacement and character replacement)
    // So now we just print everything, to keep the user informed.
    dockerStream.pipe(process.stdout);

    if (!platformImage.endsWith(':local')) {
      await DockerHelper.imagePull(platformImage, platformArch);
    }

    const crossCompileStartTime = performance.now();
    await docker.run(platformImage, cmd, dockerStream, {
      name: `homey-apps-sdk-v3-cross-compiler-${Date.now()}-${platform}`,
      platform: platformArch,
      WorkingDir: '/compilation',
      HostConfig: {
        AutoRemove: true,
        Binds: [
          `${buildPath}/requirements.txt:/compilation/requirements.txt`,
          `${buildPath}/python_packages_${typeof platform === 'string' ? platform : '<platform>'}:/compilation/python_packages`,
          `${pipCacheDir}:/root/.cache/pip`,
        ],
      },
    }).then(([output, ...rest]) => {
      // Ref: https://www.npmjs.com/package/dockerode/v/4.0.2#equivalent-of-docker-run-in-dockerode
      if (output.StatusCode !== 0) {
        process.stdout.write('\n');
        Log.error('Error while cross compiling python packages');
        process.exit(1);
      }
    });

    Log.success(`Cross compilation ${platform} done in ${performance.now() - crossCompileStartTime}ms`);
  }

}

module.exports = PythonCommands;
