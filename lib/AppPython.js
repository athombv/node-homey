/* eslint-disable no-process-exit */

'use strict';

const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const zlib = require('zlib');
const stream = require('stream');
const { promisify } = require('util');
const { arch } = require('node:process');

const colors = require('colors');
const tmp = require('tmp-promise');
const tar = require('tar-fs');
const ignoreWalk = require('ignore-walk');
const fse = require('fs-extra');
const filesize = require('filesize');

const inquirer = require('inquirer');
const semver = require('semver');
const TOML = require('smol-toml');
const AthomApi = require('../services/AthomApi');
const Log = require('./Log');
const HomeyCompose = require('./HomeyCompose');
const DockerHelper = require('./DockerHelper');
const App = require('./App');
const StacklessError = require('./StacklessError');

const statAsync = promisify(fs.stat);
const mkdirAsync = promisify(fs.mkdir);
const writeFileAsync = promisify(fs.writeFile);
const copyFileAsync = promisify(fs.copyFile);
const pipeline = promisify(stream.pipeline);

const PYTHON_CACHE_FOLDER = '.python_cache';
const INVALID_PYTHON_MODULE_CHARACTERS = /[^a-z0-9_]/g;
// TODO set to software version that supports Python apps
const MINIMUM_HOMEY_PRO_INSTALL_SOFTWARE_VERSION = '0.0.0';
const SUPPORTED_ARCHITECTURES = ['arm64', 'amd64'];

const SUPPORTED_PYTHON_VERSIONS = ['3.13'];

class AppPython extends App {

  static async checkHomeyCompatibility(homey, forInstall) {
    if (!(homey.__properties.platformVersion === 2 && homey.__properties.apiVersion === 3)) {
      throw new StacklessError('Python apps are currently only supported on the Homey Pro');
    }
    if (!forInstall) {
      return;
    }
    const systemInfo = await homey.system.getInfo();
    const softwareVersion = systemInfo.homeyVersion;
    if (semver.lt(softwareVersion, MINIMUM_HOMEY_PRO_INSTALL_SOFTWARE_VERSION)) {
      throw new StacklessError(`Homey version ${softwareVersion} does not support Python apps`);
    }
  }

  static usesTypeScript({ appPath }) {
    throw new Error('Method should not be called for Python: "App.usesTypeScript"');
  }

  static usesModules({ appPath }) {
    throw new Error('Method should not be called for Python: "App.usesModules"');
  }

  static async transpileToTypescript({ appPath }) {
    throw new Error('Method should not be called for Python: "App.transpileToTypescript".');
  }

  async _validate({ level = 'debug' } = {}) {
    await AppPython.checkPythonVersion(this.path);
    return super._validate({ level });
  }

  async run({
    clean = false,
    remote = false,
    skipBuild = false,
    linkModules = '',
    network,
    dockerSocketPath,
  } = {}) {
    const homey = await AthomApi.getActiveHomey();

    await AppPython.checkHomeyCompatibility(homey, false);

    const platform = AppPython.getLocalPlatform();
    const venvPath = path.join(this.path, PYTHON_CACHE_FOLDER, platform ?? 'local', '.venv');
    if (!fse.pathExistsSync(venvPath)) {
      Log.error('No virtual environment found, creating...');
      await this.installDependencies({
        dockerSocketPath,
        silent: true,
      });
    }

    if (remote) {
      return this.runRemote({
        homey,
        clean,
        skipBuild,
        dockerSocketPath,
      });
    }

    return this.runDocker({
      homey,
      clean,
      skipBuild,
      linkModules,
      network,
      dockerSocketPath,
    });
  }

  async buildForLocalRunner(skipBuild, dockerSocketPath) {
    if (skipBuild) {
      Log(colors.yellow('\n⚠ Can\'t skip build step for Python!\n'));
    }
    await this.preprocess({ copyAppProductionDependencies: true, platforms: [AppPython.getLocalPlatform()] });
  }

  static collectRunnerEnv() {
    return {
      HOMEY_APP_RUNNER_DEVMODE: process.env.HOMEY_APP_RUNNER_DEVMODE === '1',
      HOMEY_APP_RUNNER_PATH: process.env.HOMEY_APP_RUNNER_PATH_PYTHON, // e.g. /Users/username/Git/homey-app-runner/src
      HOMEY_APP_RUNNER_CMD: ['sh', 'setup.sh'],
      HOMEY_APP_RUNNER_ID: process.env.HOMEY_APP_RUNNER_ID_PYTHON || 'ghcr.io/athombv/python-homey-app-runner:latest',
      HOMEY_APP_BUILDER_ID: process.env.HOMEY_APP_BUILDER_ID_PYTHON || 'ghcr.io/athombv/python-homey-app-builder:latest',
      HOMEY_APP_RUNNER_SDK_PATH: process.env.HOMEY_APP_RUNNER_SDK_PATH_PYTHON, // e.g. /Users/username/Git/python-homey-sdk-v3/dist
    };
  }

  async startRunnerContainer(
    sessionId,
    manifest,
    env,
    serverPort,
    inspectPort,
    network,
    homey,
    tmpDir,
    userdataDir,
    linkModules,
    docker,
  ) {
    const {
      HOMEY_APP_RUNNER_DEVMODE,
      HOMEY_APP_RUNNER_PATH,
      HOMEY_APP_RUNNER_CMD,
      HOMEY_APP_RUNNER_ID,
      HOMEY_APP_RUNNER_SDK_PATH,
    } = AppPython.collectRunnerEnv();
    // Download Image (if there is no local override)
    if (!process.env.HOMEY_APP_RUNNER_ID_PYTHON) {
      await DockerHelper.imagePullIfNeeded(HOMEY_APP_RUNNER_ID, AppPython.getLocalPlatform());
    }

    const host = await DockerHelper.determineHost();

    const containerEnv = [
      'APP_PATH=/app',
      `APP_ENV=${JSON.stringify(env)}`,
      `SERVER=ws://${host}:${serverPort}`,
      'DEBUG=1',
    ];

    if (HOMEY_APP_RUNNER_DEVMODE) {
      containerEnv.push('DEVMODE=1');
    }

    const containerBinds = [
      `${this._homeyBuildPath}:/app`,
    ];

    await fse.ensureDir(path.join(this._homeyBuildPath, '.venv'));

    if (HOMEY_APP_RUNNER_PATH !== undefined) {
      containerBinds.push(`${HOMEY_APP_RUNNER_PATH}:/runner/src:ro,z`);
    }

    if (HOMEY_APP_RUNNER_SDK_PATH !== undefined) {
      containerBinds.push(`${HOMEY_APP_RUNNER_SDK_PATH}:/runner/sdk:ro,z`);
    }

    // Mount /userdata & /tmp for Homey Pro
    if (homey.platform === 'local') {
      containerBinds.push(
        `${tmpDir}:/tmp:rw,z`,
        `${userdataDir}:/userdata:rw,z`,
      );
    }

    const createOpts = {
      name: `homey-app-runner-${sessionId}-${manifest.id}-v${manifest.version}`,
      Env: containerEnv,
      Labels: {
        'com.athom.session': sessionId,
        'com.athom.port': String(serverPort),
        'com.athom.app-id': manifest.id,
        'com.athom.app-version': manifest.version,
        'com.athom.app-runtime': manifest.runtime,
      },
      HostConfig: {
        NetworkMode: network,
        Binds: containerBinds,
      },
      User: process.getuid !== undefined ? `${process.getuid()}:${process.getgid()}` : undefined,
    };

    Log.success(`Starting \`${manifest.id}@${manifest.version}\` in a Docker container...`);
    Log.info(' — Press CTRL+C to quit.');
    Log('─────────────── Logging stdout & stderr ───────────────');

    const passThrough = new stream.PassThrough();
    passThrough.pipe(process.stdout);

    await docker.run(HOMEY_APP_RUNNER_ID, HOMEY_APP_RUNNER_CMD, passThrough, createOpts);
  }

  async install({
    homey,
    clean = false,
    skipBuild = false,
    debug = false,
    findLinks,
    dockerSocketPath,
  } = {}) {
    if (homey.platform === 'cloud') {
      throw new Error('Installing apps is not available on Homey Cloud.\nPlease run your app instead.');
    }
    await AppPython.checkHomeyCompatibility(homey, true);

    if (skipBuild) {
      Log(colors.yellow('\n⚠ Can\'t skip build step for Python!\n'));
    }
    await this.preprocess({ copyAppProductionDependencies: true });

    const valid = await this._validate();
    if (valid !== true) throw new Error('Not installing, please fix the validation issues first');

    Log.success('Packing Homey App...');

    const app = await this._getPackStream({
      appPath: this._homeyBuildPath,
    });
    const env = await this._getEnv();

    Log.success(`Installing Homey App on \`${homey.name}\` (${await homey.baseUrl})...`);

    try {
      const result = await homey.devkit.runApp({
        app,
        env,
        debug,
        clean,
      });

      Log.success(`Homey App \`${result.appId}\` successfully installed`);

      return result;
    } catch (err) {
      Log.error(err);
      process.exit();
    }
  }

  async preprocess(
    {
      copyAppProductionDependencies = true,
      platforms = AppPython.getCompilationPlatforms(),
    } = {},
  ) {
    Log.success('Pre-processing app...');
    // Build app.json from Homey Compose files
    if (App.hasHomeyCompose({ appPath: this.path })) {
      await HomeyCompose.build({ appPath: this.path, usesModules: false });
    }

    // Clear the .homeybuild/ folder
    await fse.remove(this._homeyBuildPath).catch(async (err) => {
      // It helps to wait a bit when ENOTEMPTY is thrown.
      if (err.code === 'ENOTEMPTY') {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return fse.remove(this._homeyBuildPath);
      }

      throw err;
    });

    await this._copyAppSourceFiles();

    // Collect production dependencies in ./homeybuild
    if (copyAppProductionDependencies) {
      for (const platform of platforms) {
        const venvCachePath = path.join(this.path, PYTHON_CACHE_FOLDER, platform ?? 'local', '.venv');
        if (!fse.pathExistsSync(venvCachePath)) {
          throw new StacklessError("Missing virtual environment. Did you run 'homey app dependencies install'?");
        }
      }
      await this.collectProductionDependencies(platforms);
    }

    // Ensure `/.homeybuild` is added to `.gitignore`, if it exists
    const gitIgnorePath = path.join(this.path, '.gitignore');
    if (await fse.pathExists(gitIgnorePath)) {
      const gitIgnore = await fse.readFile(gitIgnorePath, 'utf8');
      if (!gitIgnore.includes('.homeybuild')) {
        Log.success('Automatically added `/.homeybuild/` to .gitignore');
        await fse.writeFile(gitIgnorePath, `${gitIgnore}\n\n# Added by Homey CLI\n/.homeybuild/`);
      }
    }

    Log.success('Pre-processed app');
  }

  async collectProductionDependencies(platforms) {
    for (const platform of platforms) {
      const venvCachePath = path.join(this.path, PYTHON_CACHE_FOLDER, platform ?? 'local', '.venv');
      const venvBuildPath = platform === undefined ? path.join(this._homeyBuildPath, '.venv') : path.join(this._homeyBuildPath, 'venvs', platform);
      await fsPromises.cp(venvCachePath, venvBuildPath, { recursive: true });

      // Remove broken symlinks
      const venvBinPath = path.join(venvBuildPath, 'bin');
      const binFiles = fs.readdirSync(venvBinPath);
      const pythonBinRegex = /^python\d*(?:.\d+)?$/;
      const pythonBinFiles = binFiles.filter((value) => pythonBinRegex.test(value));
      for (const pythonBinFile of pythonBinFiles) {
        fs.rmSync(path.join(venvBinPath, pythonBinFile));
      }
    }
  }

  async _getPackStream({
    appPath = this._homeyBuildPath,
  } = {}) {
    let appSize = 0;
    let numFiles = 0;

    const tmpFile = await tmp.file({ postfix: '.tgz' });

    await pipeline(
      tar.pack(appPath, {
        dereference: true,
        map(header) {
          if (header.type === 'file') numFiles += 1;
        },
        ignore(name) {
          // Include just the packages in lib and ignore the rest of the venv
          const venvLibRegex = /\/venvs\/\w+\/lib(?!64)/;
          // Do not exclude the venv root folders
          const venvFolderRegex = /\/venvs\/\w+$/;

          if (name.includes('/venvs/')) {
            if (venvFolderRegex.test(name)) return false;
            return !venvLibRegex.test(name);
          }

          if (name.endsWith('pyproject.toml') || name.endsWith('uv.lock')) return true;

          if (name.startsWith('.')) return true;
          if (name.includes('/.git/')) return true;
          if (name.includes(`/${PYTHON_CACHE_FOLDER}/`)) return true;
          return false;
        },
      }).on('data', (chunk) => {
        appSize += chunk.length;
      }),
      zlib.createGzip(),
      fs.createWriteStream(tmpFile.path),
    );

    Log.info(` — App archive size: ${filesize(appSize)}, ${numFiles} files`);

    const readFileStream = fs.createReadStream(tmpFile.path);

    stream.finished(readFileStream, () => {
      tmpFile.cleanup().catch((error) => {
        // ignore
      });
    });

    return readFileStream;
  }

  async _getAppSourceFiles() {
    const DEFAULT_IGNORE_RULES_FILE = '$default-ignore-rules';

    const walker = new ignoreWalk.Walker({
      path: this.path,
      ignoreFiles: ['.homeyignore', DEFAULT_IGNORE_RULES_FILE],
      includeEmpty: true,
      follow: true,
    });

    const ignoreRules = [
      '.*',
      '.homeybuild',
      '.venv',
      PYTHON_CACHE_FOLDER,
      'env.json',
      '*.compose.json',
    ];
    // Add a "file" containing our default ignore rules for dotfiles, env.json and node_modules
    walker.onReadIgnoreFile(DEFAULT_IGNORE_RULES_FILE, ignoreRules.join('\r\n'), () => { });

    const fileEntries = await new Promise((resolve, reject) => {
      walker.on('done', resolve).on('error', reject).start();
    });

    return fileEntries;
  }

  getDriverIdPrompt(driverName) {
    return {
      type: 'input',
      name: 'driverId',
      message: 'What is your Driver\'s ID?',
      default: () => {
        let name = driverName;
        name = name.toLowerCase();
        name = name.replace(/ /g, '_');
        name = name.replace(INVALID_PYTHON_MODULE_CHARACTERS, '');
        return name;
      },
      validate: (input) => {
        if (!input.match(/^[a-z_]/)) {
          throw new Error('Invalid characters: needs to start with a letter or underscore (_)');
        }
        if (input.match(INVALID_PYTHON_MODULE_CHARACTERS)) {
          throw new Error('Invalid characters: only use letters, numbers, and underscores (_)');
        }
        if (fs.existsSync(path.join(this.path, 'drivers', input))) {
          throw new Error('Driver directory already exists!');
        }
        return true;
      },
    };
  }

  async copyDriverAndDeviceTemplate(templatePath, driverPath) {
    await copyFileAsync(
      path.join(templatePath, 'driver.py'),
      path.join(driverPath, 'driver.py'),
    );
    await copyFileAsync(
      path.join(templatePath, 'device.py'),
      path.join(driverPath, 'device.py'),
    );
  }

  async installRfLibrary() {
    throw new Error('homey-rfdriver is not supported for Python yet...');
  }

  async installZigbeeLibrary() {
    throw new Error('homey-zigbeedriver is not supported for Python yet...');
  }

  async installZWaveLibrary() {
    throw new Error('homey-zwavedriver is not supported for Python yet...');
  }

  async installOAuth2Library() {
    throw new Error('homey-oauth2app is not supported for Python yet...');
  }

  async copyWidgetTemplate(widgetPath, widgetName) {
    await fse.ensureDir(widgetPath);

    const widgetJson = {
      name: { en: widgetName },
      height: 188,
      settings: [],
      api: {
        get_something: {
          method: 'GET',
          path: '/',
        },
        add_something: {
          method: 'POST',
          path: '/',
        },
        update_something: {
          method: 'PUT',
          path: '/:id',
        },
        delete_something: {
          method: 'DELETE',
          path: '/:id',
        },
      },
    };

    await writeFileAsync(path.join(widgetPath, 'widget.compose.json'), JSON.stringify(widgetJson, false, 2));

    const templatePath = path.join(__dirname, '..', 'assets', 'templates', 'app', 'widgets');
    await fse.ensureDir(path.join(widgetPath, 'public'));
    await copyFileAsync(path.join(templatePath, 'public/index.html'), path.join(widgetPath, 'public/index.html'));
    await copyFileAsync(path.join(templatePath, 'public/homey-logo.png'), path.join(widgetPath, 'public/homey-logo.png'));
    await copyFileAsync(path.join(templatePath, 'api.py'), path.join(widgetPath, 'api.py'));
    await copyFileAsync(path.join(templatePath, 'preview-dark.png'), path.join(widgetPath, 'preview-dark.png'));
    await copyFileAsync(path.join(templatePath, 'preview-light.png'), path.join(widgetPath, 'preview-light.png'));
  }

  static async create({ appPath: cwd, globalAnswers }) {
    const stat = await statAsync(cwd);
    if (!stat.isDirectory()) {
      throw new Error('Invalid path, must be a directory');
    }

    const localAnswers = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Seems good?',
        default: true,
      },
    ]);

    // Combine global and local answers
    const answers = {
      ...globalAnswers,
      ...localAnswers,
    };

    if (!answers.confirm) return;

    const appPath = path.join(cwd, answers.id);
    // Create the app folder (and fail if it already exists)
    await mkdirAsync(appPath);

    const latestSupportedPythonVersion = SUPPORTED_PYTHON_VERSIONS.at(-1);

    const appJson = {
      id: answers.id,
      version: '1.0.0',
      compatibility: '>=12.4.0',
      sdk: 3,
      runtime: 'python',
      pythonVersion: latestSupportedPythonVersion,
      platforms: answers.platforms,
      name: { en: answers.appName },
      description: { en: answers.appDescription },
      category: [answers.category],
      permissions: [],
      images: {
        small: '/assets/images/small.png',
        large: '/assets/images/large.png',
        xlarge: '/assets/images/xlarge.png',
      },
    };

    try {
      const profile = await AthomApi.getProfile();
      appJson.author = {
        name: `${profile.firstname} ${profile.lastname}`,
        email: profile.email,
      };
    } catch (err) { }

    // make dirs
    const dirs = [
      'locales',
      'drivers',
      'assets',
      path.join('assets', 'images'),
    ];
    for (let i = 0; i < dirs.length; i++) {
      const dir = dirs[i];
      try {
        await mkdirAsync(path.join(appPath, dir));
      } catch (err) {
        Log(err);
      }
    }

    await HomeyCompose.createComposeDirectories({ appPath });

    await fsPromises.writeFile(path.join(appPath, '.python-version'), latestSupportedPythonVersion);

    const pyproject = {
      project: {
        name: answers.id,
        version: '1.0.0',
        dependencies: [],
      },
      'dependency-groups': {
        dev: [],
      },
      'tool.uv': {
        'required-environments': [
          "sys_platform == 'linux' and platform_machine == 'aarch64' and platform_python_implementation == 'CPython'",
        ],
      },
      'tool.pyright': {
        reportMissingModuleSource: false,
      },
    };

    await fsPromises.writeFile(path.join(appPath, 'pyproject.toml'), TOML.stringify(pyproject));

    if (answers['github-workflows']) {
      Log.error('Github workflows are not supported for Python yet.');
      // TODO call once implemented
    }

    await writeFileAsync(path.join(appPath, '.homeycompose', 'app.json'), JSON.stringify(appJson, false, 2));

    const generatedAppManifestWarning = {
      _comment: 'This file is generated. Please edit .homeycompose/app.json instead.',
      ...appJson,
    };
    await writeFileAsync(path.join(appPath, 'app.json'), JSON.stringify(generatedAppManifestWarning, false, 2));

    await writeFileAsync(path.join(appPath, 'locales', 'en.json'), JSON.stringify({}, false, 2));
    await writeFileAsync(path.join(appPath, 'README.txt'), `${appJson.description.en}\n`);

    // i18n pre-support
    // TODO check if this works after creating i18n inquirer stuff
    if (appJson.description.nl) {
      await writeFileAsync(path.join(appPath, 'README.nl.txt'), `${appJson.description.nl}\n`);
    }

    // copy files
    const templatePath = path.join(__dirname, '..', 'assets', 'templates', 'app');
    const files = [
      path.join('assets', 'icon.svg'),
      'app.py',
    ];

    if (answers.license) {
      files.push('LICENSE');
      files.push('CODE_OF_CONDUCT.md');
      files.push('CONTRIBUTING.md');
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await copyFileAsync(path.join(templatePath, file), path.join(appPath, file));
      } catch (err) {
        Log(err);
      }
    }

    const gitIgnore = '/env.json\n/.venv/\n/.homeybuild/\n'
      + `/${PYTHON_CACHE_FOLDER}/`;

    await writeFileAsync(path.join(appPath, '.gitignore'), gitIgnore.toString());
    await writeFileAsync(path.join(appPath, '.homeychangelog.json'), JSON.stringify({
      [appJson.version]: {
        en: 'First version!',
      },
    }, false, 2));

    Log.success(`App created in \`${appPath}\``);
    Log(`\nLearn more about Homey app development at: ${colors.underline('https://apps.developer.homey.app')}\n`);
  }

  skipFolderForOpenAI(file) {
    return file === 'locales' || file === '.venv' || file === PYTHON_CACHE_FOLDER || file === '.homeybuild';
  }

  static async addTypes({ appPath, findLinks }) {
    throw new Error('Installing homey-stubs locally needs to be done manually');
  }

  async addGitHubWorkflows({ appPath }) {
    throw new Error('Github workflows are not supported for Python yet.');
  }

  async syncPythonVersion() {
    let manifest;
    try {
      manifest = App.getComposeManifest({ appPath: this.path });
    } catch (err) {
      manifest = App.getManifest({ appPath: this.path });
    }

    const pythonVersion = manifest.pythonVersion;

    if (!SUPPORTED_PYTHON_VERSIONS.includes(pythonVersion)) {
      throw new StacklessError(`Unsupported Python version: ${pythonVersion}`);
    }

    const previousPythonVersion = await fsPromises.readFile(path.join(this.path, PYTHON_CACHE_FOLDER, '.python-version'), 'utf8').catch(() => undefined);

    if (pythonVersion !== previousPythonVersion) {
      Log.success(`Python version changed to ${pythonVersion}`);
      await fsPromises.writeFile(path.join(this.path, '.python-version'), pythonVersion);
      await fse.ensureFile(path.join(this.path, PYTHON_CACHE_FOLDER, '.python-version'));
      await fsPromises.writeFile(path.join(this.path, PYTHON_CACHE_FOLDER, '.python-version'), pythonVersion);
    }
  }

  async syncPythonDependencies() {
    let manifest; let manifestFolder;
    try {
      manifest = App.getComposeManifest({ appPath: this.path });
      manifestFolder = path.join(this.path, '.homeycompose');
    } catch (err) {
      manifest = App.getManifest({ appPath: this.path });
      manifestFolder = this.path;
    }

    const pythonManifestFile = await fsPromises.readFile(path.join(this.path, 'pyproject.toml'), 'utf8').catch(() => undefined);
    const pythonManifest = TOML.parse(pythonManifestFile);
    manifest.pythonDependencies = pythonManifest?.project?.dependencies ?? [];

    await writeFileAsync(path.join(manifestFolder, 'app.json'), JSON.stringify(manifest, undefined, 2));

    // Build app.json from Homey Compose files
    if (App.hasHomeyCompose({ appPath: this.path })) {
      await HomeyCompose.build({ appPath: this.path });
    }
  }

  async installDependencies({ findLinks, dockerSocketPath, silent = false }) {
    await this.syncPythonVersion();

    await AppPython.uvCommand(['uv', 'sync', '--active', '--no-dev', '-q'], this.path, { findLinks, dockerSocketPath, skipVersionCheck: true });

    await this.syncPythonDependencies();

    if (!silent) {
      Log.success('Installed dependencies');
      await this.listDependencies();
    }
  }

  async addDependencies({
    dependencies, dev = false, findLinks, dockerSocketPath,
  }) {
    await this.syncPythonVersion();

    const command = ['uv', 'add', '--active', '-q'];
    if (dev) command.push('--dev');
    command.push(...dependencies);

    await AppPython.uvCommand(command, this.path, { findLinks, dockerSocketPath, skipVersionCheck: true });

    await this.syncPythonDependencies();

    let successMessage = 'Added packages';
    if (dev) successMessage += ' for development';
    Log.success(successMessage);
    await this.listDependencies();
  }

  async removeDependencies({
    dependencies, dev = false, findLinks, dockerSocketPath,
  }) {
    await this.syncPythonVersion();

    const command = ['uv', 'remove', '--active', '-q'];
    if (dev) command.push('--dev');
    command.push(...dependencies);

    await AppPython.uvCommand(command, this.path, { findLinks, dockerSocketPath, skipVersionCheck: true });

    await this.syncPythonDependencies();

    let successMessage = 'Removed packages';
    if (dev) successMessage += ' for development';
    Log.success(successMessage);
    await this.listDependencies();
  }

  async listDependencies() {
    const list = await AppPython.uvCommand(['uv', 'tree', '-q'], this.path, { onlyForLocal: true });
    Log(list);
  }

  static getCompilationPlatforms() {
    if (arch === 'x64' || arch === 'arm64') {
      return SUPPORTED_ARCHITECTURES;
    }
    return [undefined, ...SUPPORTED_ARCHITECTURES];
  }

  static getLocalPlatform() {
    switch (arch) {
      case 'x64':
        return 'amd64';
      case 'arm64':
        return 'arm64';
      default:
        return undefined;
    }
  }

  static async uvCommand(command, projectPath, {
    findLinks, dockerSocketPath, onlyForLocal = false, skipVersionCheck = false,
  } = {}) {
    const { HOMEY_APP_BUILDER_ID } = AppPython.collectRunnerEnv();
    const docker = await DockerHelper.ensureDocker({ dockerSocketPath });
    fse.ensureDir(path.join(projectPath, '.venv'));

    const platforms = onlyForLocal ? [AppPython.getLocalPlatform()] : AppPython.getCompilationPlatforms();

    for (const platform of platforms) {
      // Download Image (if there is no local override)
      if (!process.env.HOMEY_APP_BUILDER_ID_PYTHON) {
        await DockerHelper.imagePullIfNeeded(HOMEY_APP_BUILDER_ID, platform);
      }
    }

    if (!skipVersionCheck) {
      await AppPython.checkPythonVersion(projectPath);
    }

    const cacheBasePath = path.join(projectPath, PYTHON_CACHE_FOLDER);

    for (const platform of platforms) {
      const containerBinds = [
        `${projectPath}:/project`,
      ];

      const venvPath = path.join(cacheBasePath, platform ?? 'local', '.venv');
      const uvCachePath = path.join(cacheBasePath, platform ?? 'local', 'uv_cache');
      await fse.ensureDir(venvPath);
      await fse.ensureDir(uvCachePath);
      containerBinds.push(`${venvPath}:/.venv`, `${uvCachePath}:/uv_cache`);

      if (!onlyForLocal) {
        Log.success('Executing for', platform ?? 'local', 'architecture...');
        if (platform !== AppPython.getLocalPlatform()) {
          Log('This may take some time due to emulation.');
        }
      }

      const dockerCommand = [...command];

      if (findLinks !== undefined) {
        containerBinds.push(`${findLinks}:/find_links:ro`);
        dockerCommand.push('--find-links', '/find-links');
      }

      const createOptions = {
        WorkingDir: '/project',
        HostConfig: {
          AutoRemove: true,
          Binds: containerBinds,
        },
        User: process.getuid !== undefined ? `${process.getuid()}:${process.getgid()}` : undefined,
        platform,
      };

      const passThrough = new stream.PassThrough({ encoding: 'utf8' });

      let runResolve;
      let runReject;
      const runPromise = new Promise((resolve, reject) => {
        runResolve = resolve;
        runReject = reject;
      });

      const callback = (err, res) => {
        if (err !== null) {
          runReject(err);
        } else if (res.StatusCode !== 0) {
          const stderr = passThrough.read();
          if (stderr !== null) {
            runReject(AppPython.cleanUvError(stderr));
          } else {
            runReject();
          }
        } else {
          const stdout = passThrough.read();
          runResolve(stdout);
        }
      };

      docker.run(HOMEY_APP_BUILDER_ID, dockerCommand, passThrough, createOptions, callback);
      const result = await runPromise.catch((error) => {
        if (error instanceof Error) {
          throw error;
        } else if (error.endsWith('exec format error')) {
          // Emulation was not set up correctly
          throw DockerHelper.createDockerEmulationError(platform);
        } else {
          throw new Error(error);
        }
      });
      if (onlyForLocal) {
        return result;
      }
    }
  }

  static cleanUvError(error) {
    let cleanError = error.replace(/^x/, '');
    cleanError = cleanError.split('help:')[0];
    cleanError = cleanError.trim();
    return cleanError;
  }

  static async checkPythonVersion(projectPath) {
    let manifest;
    try {
      manifest = App.getComposeManifest({ appPath: projectPath });
    } catch (err) {
      manifest = App.getManifest({ appPath: projectPath });
    }

    const pythonVersion = manifest.pythonVersion;

    if (!SUPPORTED_PYTHON_VERSIONS.includes(pythonVersion)) {
      throw new StacklessError(`Unsupported Python version: ${pythonVersion}`);
    }

    const previousPythonVersion = await fsPromises.readFile(path.join(projectPath, PYTHON_CACHE_FOLDER, '.python-version'), 'utf8').catch(() => undefined);

    if (pythonVersion !== previousPythonVersion) {
      throw new StacklessError("Inconsistent Python versions detected. Did you run 'homey app dependencies install'?");
    }
  }

}

module.exports = AppPython;
