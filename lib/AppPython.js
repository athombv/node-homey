/* eslint-disable no-process-exit */

'use strict';

const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const zlib = require('zlib');
const stream = require('stream');
const { promisify } = require('util');
const sharp = require('sharp');

const colors = require('colors');
const tmp = require('tmp-promise');
const tar = require('tar-fs');
const ignoreWalk = require('ignore-walk');
const fse = require('fs-extra');
const filesize = require('filesize');

const { exec } = require('child_process');
const inquirer = require('inquirer');
const AthomApi = require('../services/AthomApi');
const Log = require('./Log');
const HomeyCompose = require('./HomeyCompose');
const DockerHelper = require('./DockerHelper');
const AppProject = require('./AppProject');
const App = require('./App');
const Settings = require('../services/Settings');

const execAsync = promisify(exec);
const statAsync = promisify(fs.stat);
const mkdirAsync = promisify(fs.mkdir);
const writeFileAsync = promisify(fs.writeFile);
const copyFileAsync = promisify(fs.copyFile);
const pipeline = promisify(stream.pipeline);

const PYTHON_CACHE_FOLDER = '.python_cache';

class AppPython extends App {

  static usesTypeScript({ appPath }) {
    throw new Error('Method should not be called for Python: "App.usesTypeScript"');
  }

  static usesModules({ appPath }) {
    throw new Error('Method should not be called for Python: "App.usesModules"');
  }

  static async transpileToTypescript({ appPath }) {
    throw new Error('Method should not be called for Python: "App.transpileToTypescript".');
  }

  async build(forProduction = false) {
    Log.success('Building app...');
    await this.preprocess(forProduction);

    const valid = await this._validate();
    if (valid !== true) throw new Error('The app is not valid, please fix the validation issues first.');

    Log.success('App built successfully');
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

    // TODO check whether the Homey supports Python apps
    if (remote) {
      return this.runRemote({
        homey,
        clean,
        skipBuild,
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

  async buildForLocalRunner(skipBuild) {
    if (skipBuild) {
      Log(colors.yellow('\n⚠ Can\'t skip build step for Python!\n'));
    }
    await this.preprocess(false);
  }

  static collectRunnerEnv() {
    return {
      HOMEY_APP_RUNNER_DEVMODE: process.env.HOMEY_APP_RUNNER_DEVMODE === '1',
      HOMEY_APP_RUNNER_PATH: process.env.HOMEY_APP_RUNNER_PATH_PYTHON, // e.g. /Users/username/Git/homey-app-runner/src
      HOMEY_APP_RUNNER_CMD: ['sh', 'setup.sh'],
      HOMEY_APP_RUNNER_ID: process.env.HOMEY_APP_RUNNER_ID_PYTHON || 'ghcr.io/athombv/python-homey-app-runner:latest',
      HOMEY_APP_RUNNER_SDK_PATH: process.env.HOMEY_APP_RUNNER_SDK_PATH_PYTHON, // e.g. /Users/username/Git/python-homey-sdk-v3/dist
      HOMEY_APP_IGNORE_PYTHON_CACHE: process.env.HOMEY_APP_IGNORE_PYTHON_CACHE === '1',
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
      HOMEY_APP_IGNORE_PYTHON_CACHE,
    } = AppPython.collectRunnerEnv();

    // Download Image (if there is no local override)
    if (!process.env.HOMEY_APP_RUNNER_ID_PYTHON) {
      // Check if the image exists, or needs refresh pull
      if (!DockerHelper.imageExists(HOMEY_APP_RUNNER_ID) || DockerHelper.imageNeedPull(HOMEY_APP_RUNNER_ID)) {
        await DockerHelper.imagePull(HOMEY_APP_RUNNER_ID);
      }
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

    if (!HOMEY_APP_IGNORE_PYTHON_CACHE) {
      const venvPath = path.join(this.path, PYTHON_CACHE_FOLDER, 'local', '.venv');
      const uvCachePath = path.join(this.path, PYTHON_CACHE_FOLDER, 'local', 'uv_cache');
      await fse.ensureDir(venvPath);
      await fse.ensureDir(uvCachePath);
      containerBinds.push(
        `${venvPath}:/app/.venv`,
        `${uvCachePath}:/uv_cache`,
      );
    }

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
  } = {}) {
    if (homey.platform === 'cloud') {
      throw new Error('Installing apps is not available on Homey Cloud.\nPlease run your app instead.');
    }
    if (skipBuild) {
      Log(colors.yellow('\n⚠ Can\'t skip build step for Python!\n'));
    }
    await this.preprocess(true);

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
    forProduction = false,
  ) {
    Log.success('Pre-processing app...');
    // Build app.json from Homey Compose files
    if (AppProject.hasHomeyCompose({ appPath: this.path })) {
      await HomeyCompose.build({ appPath: this.path, usesModules: false });
    }

    // Clear the .homeybuild/ folder
    await fse.remove(this._homeyBuildPath).catch(async err => {
      // It helps to wait a bit when ENOTEMPTY is thrown.
      if (err.code === 'ENOTEMPTY') {
        await new Promise(resolve => setTimeout(resolve, 2000));
        return fse.remove(this._homeyBuildPath);
      }

      throw err;
    });

    await this._copyAppSourceFiles();

    // Copy production dependencies to .homeybuild/
    // Also compile them to .homeybuild/.venv/
    if (forProduction) {
      await this._copyAppProductionDependencies();
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

  async _copyAppSourceFiles() {
    const sourceFiles = await this._getAppSourceFiles();

    for (const filePath of sourceFiles) {
      const fullSrc = path.join(this.path, filePath);
      const fullDest = path.join(this._homeyBuildPath, filePath);

      await fse.copy(fullSrc, fullDest);
    }

    const appJson = await fs.promises.readFile(path.join(this.path, 'app.json')).then(data => {
      return JSON.parse(data);
    });

    if (appJson.widgets) {
      for (const [widgetId] of Object.entries(appJson.widgets)) {
        const previewLightPath = path.join(this.path, 'widgets', widgetId, 'preview-light.png');
        const previewDarkPath = path.join(this.path, 'widgets', widgetId, 'preview-dark.png');

        // eslint-disable-next-line no-useless-catch
        try {
          await fs.promises.access(previewLightPath);
          await fs.promises.access(previewDarkPath);

          const imageLight = sharp(previewLightPath);
          const imageDark = sharp(previewDarkPath);

          await fs.promises.mkdir(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__'), { recursive: true });
          await Promise.all([
            fs.promises.copyFile(previewLightPath, path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-light.png')),
            imageLight.resize(128, 128).toFile(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-light@1x.png')),
            imageLight.resize(192, 192).toFile(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-light@1.5x.png')),
            imageLight.resize(256, 256).toFile(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-light@2x.png')),
            imageLight.resize(384, 384).toFile(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-light@3x.png')),
            imageLight.resize(512, 512).toFile(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-light@4x.png')),
            fs.promises.copyFile(previewDarkPath, path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-dark.png')),
            imageDark.resize(128, 128).toFile(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-dark@1x.png')),
            imageDark.resize(192, 192).toFile(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-dark@1.5x.png')),
            imageDark.resize(256, 256).toFile(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-dark@2x.png')),
            imageDark.resize(384, 384).toFile(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-dark@3x.png')),
            imageDark.resize(512, 512).toFile(path.join(this._homeyBuildPath, 'widgets', widgetId, '__assets__', 'preview-dark@4x.png')),
          ]);
        } catch (error) {
          throw error;
        }
      }
    }
  }

  async _copyAppProductionDependencies() {
    const builderImage = process.env.HOMEY_PYTHON_CROSS_COMPILER_ID || 'ghcr.io/athombv/python-cross-compiler:latest';
    const buildContainerName = 'homey-python-cross-compiler';
    const logging = process.env.HOMEY_DOCKER_LOGGING === '1';
    Log.success('Cross-compiling Python packages...');

    let childResolve;
    let childReject;
    const childPromise = new Promise((resolve, reject) => {
      childResolve = resolve;
      childReject = reject;
    });

    const userParameter = process.getuid !== undefined ? `--user=${process.getuid()}:${process.getgid()}` : '';
    const loggingParameter = logging ? '' : '-q';

    const uvCachePath = path.join(Settings.getSettingsDirectory(), 'python-cross-compile-cache');
    await fse.ensureDir(uvCachePath);

    const venvCachePath = path.join(this.path, PYTHON_CACHE_FOLDER, 'remote', '.venv');
    await fse.ensureDir(venvCachePath);
    const venvBuildPath = path.join(this._homeyBuildPath, '.venv');
    await fse.ensureDir(venvBuildPath);

    // The Docker API does not support --platform
    const child = exec(
      `docker run ${loggingParameter} ${userParameter} --platform=arm64 --rm --name ${buildContainerName}`
      + ` --mount type=bind,src=${this._homeyBuildPath},dst=/app`
      + ` --mount type=bind,src=${venvCachePath},dst=/app/.venv`
      + ` --mount type=bind,src=${uvCachePath},dst=/uv_cache ${builderImage}`,
      (error, stdout, stderr) => {
        if (error !== null && error.code !== 0) {
          if (stderr.endsWith('exec format error\n')) {
            // Emulation was not set up correctly
            childReject(
              // eslint-disable-next-line prefer-template
              stderr
              + 'Cross-compilation should be done on aarch64.\n'
              + 'To enable aarch64 emulation make sure you use containerd:\n'
              + 'https://docs.docker.com/build/building/multi-platform/#prerequisites\n'
              + 'You may also need to install/register QEMU:\n'
              + 'https://docs.docker.com/build/building/multi-platform/#install-qemu-manually',
            );
          } else {
            childReject(stderr);
          }
        } else {
          childResolve(stderr);
        }
      },
    );

    if (logging) {
      child.stdout.on('data', data => Log.info(data));
      child.stderr.on('data', data => Log.info(data));
    }
    await childPromise;
    await fsPromises.cp(venvCachePath, venvBuildPath, { recursive: true });
  }

  async version(version) {
    if (['patch', 'minor', 'major'].includes(version)) {
      await execAsync(`uv version --bump ${version}`).catch();
    } else {
      await execAsync(`uv version ${version}`).catch();
    }
    return super.version(version);
  }

  async _getPackStream({
    appPath = this._homeyBuildPath,
  } = {}) {
    let appSize = 0;
    let numFiles = 0;

    const tmpFile = await tmp.file();

    await pipeline(
      tar.pack(appPath, {
        dereference: true,
        map(header) {
          if (header.type === 'file') numFiles += 1;
        },
        ignore(name) {
          if (name.includes('/.venv/')) return false;
          if (name.startsWith('.')) return true;
          if (name.includes('/.git/')) return true;
          if (name.includes(`/${PYTHON_CACHE_FOLDER}/`)) return true;
          return false;
        },
      }).on('data', chunk => {
        appSize += chunk.length;
      }),
      zlib.createGzip(),
      fs.createWriteStream(tmpFile.path),
    );

    Log.info(` — App archive size: ${filesize(appSize)}, ${numFiles} files`);

    const readFileStream = fs.createReadStream(tmpFile.path);

    stream.finished(readFileStream, () => {
      tmpFile.cleanup().catch(error => {
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

    const uv = await AppPython.uvAvailable();

    if (!uv) {
      Log('uv package manager not found; Python will be managed through Docker');
    }

    const localAnswers = await inquirer.prompt(uv ? [
      {
        type: 'confirm',
        name: 'ruff',
        message: 'Use ruff for linting?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'pyright',
        message: 'Use pyright for static type checking?',
        default: true,
      },
      {
        type: 'confirm',
        name: 'confirm',
        message: 'Seems good?',
        default: true,
      },
    ] : [
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
      ruff: false,
      pyright: false,
      ...localAnswers,
    };

    if (!answers.confirm) return;

    const appPath = path.join(cwd, answers.id);
    // Create the app folder (and fail if it already exists)
    await mkdirAsync(appPath);

    const appJson = {
      id: answers.id,
      version: '1.0.0',
      compatibility: '>=12.4.0',
      sdk: 3,
      runtime: 'python',
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

    await AppPython.uvCommand('uv init --bare --no-description --python "==3.13.*" .', appPath);
    await AppPython.uvCommand('uv version --quiet 1.0.0', appPath);

    // Require dependencies to be able to run on the Homey
    fs.appendFileSync(
      path.join(appPath, 'pyproject.toml'),
      '\n'
      + '[tool.uv]\n'
      + 'required-environments = [\n'
      + '    "sys_platform == \'linux\' and platform_machine == \'aarch64\' and platform_python_implementation == \'CPython\'"\n'
      + ']\n',
    );

    if (uv) {
      await AppPython.addTypes({ appPath });
    }

    if (answers.ruff) {
      await AppPython.uvCommand('uv add --dev ruff', appPath);
    }

    if (answers.pyright) {
      await AppPython.uvCommand('uv add --dev pyright', appPath);
      // Disable warning for missing homey SDK sources
      fs.appendFileSync(
        path.join(appPath, 'pyproject.toml'),
        '\n'
        + '[tool.pyright]\n'
        + 'reportMissingModuleSource = false\n',
      );
    }

    if (answers['github-workflows']) {
      Log.error('Github workflows are not supported for Python yet.');
      // TODO call once implemented
    }

    await writeFileAsync(path.join(appPath, '.homeycompose', 'app.json'), JSON.stringify(appJson, false, 2));

    const generatedAppManifestWarning = {
      _comment: 'This file is generated. Please edit .homeycompose/app.json instead.',
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
    await AppPython.uvCommand('uv add --dev homey-stubs', appPath, { findLinks });
  }

  async addGitHubWorkflows({ appPath }) {
    throw new Error('Github workflows are not supported for Python yet.');
  }

  async installDependencies({ findLinks }) {
    const command = 'uv sync';

    await AppPython.uvCommand(command, this.path, { findLinks });
    const { stdout } = await AppPython.uvCommand('uv tree', this.path);

    Log.success('Installed dependencies');
    Log(stdout);
  }

  async addDependencies({ dependencies, dev = false, findLinks }) {
    let command = 'uv add';
    if (dev) command += ' --dev';
    command += ` ${dependencies.join(' ')}`;

    await AppPython.uvCommand(command, this.path, { findLinks });
    const { stdout } = await AppPython.uvCommand('uv tree', this.path);

    let successMessage = 'Added packages';
    if (dev) successMessage += ' for development';
    Log.success(successMessage);
    Log(stdout);
  }

  async removeDependencies({ dependencies, dev = false, findLinks }) {
    let command = 'uv remove';
    if (dev) command += ' --dev';
    command += ` ${dependencies.join(' ')}`;

    await AppPython.uvCommand(command, this.path, { findLinks });
    const { stdout } = await AppPython.uvCommand('uv tree', this.path);

    let successMessage = 'Removed packages';
    if (dev) successMessage += ' for development';
    Log.success(successMessage);
    Log(stdout);
  }

  async listDependencies() {
    const { stdout } = await execAsync('uv tree');
    Log(stdout);
  }

  static async uvAvailable() {
    return execAsync('uv self version')
      .then(() => true)
      .catch(() => false);
  }

  static async uvCommand(command, projectPath, { findLinks, pythonCachePath } = {}) {
    if (await this.uvAvailable()) {
      let uvCommand = command;
      if (findLinks !== undefined) uvCommand += ` --find-links ${findLinks}`;
      return execAsync(uvCommand, { cwd: projectPath });
    }

    const { HOMEY_APP_RUNNER_ID, HOMEY_APP_IGNORE_PYTHON_CACHE } = AppPython.collectRunnerEnv();
    await DockerHelper.ensureDocker();
    fse.ensureDir(path.join(projectPath, '.venv'));

    let dockerCommand = `docker run --rm -w /project --mount type=bind,src=${projectPath},dst=/project`;

    if (process.getuid !== undefined) {
      dockerCommand += ` --user ${process.getuid()}:${process.getgid()}`;
    }

    if (!HOMEY_APP_IGNORE_PYTHON_CACHE) {
      const cachePath = pythonCachePath ?? path.join(projectPath, PYTHON_CACHE_FOLDER);
      const venvPath = path.join(cachePath, 'local', '.venv');
      const uvCachePath = path.join(cachePath, 'local', 'uv_cache');
      await fse.ensureDir(venvPath);
      await fse.ensureDir(uvCachePath);
      dockerCommand += ` --mount type=bind,src=${venvPath},dst=/project/.venv`;
      dockerCommand += ` --mount type=bind,src=${uvCachePath},dst=/uv_cache`;
    }

    if (findLinks !== undefined) {
      dockerCommand += ` --mount type=bind,src=${findLinks},dst=/find_links,ro`;
      dockerCommand = `${dockerCommand} ${HOMEY_APP_RUNNER_ID} ${command} --find-links /find_links`;
    } else {
      dockerCommand = `${dockerCommand} ${HOMEY_APP_RUNNER_ID} ${command}`;
    }

    return execAsync(dockerCommand);
  }

}

module.exports = AppPython;
