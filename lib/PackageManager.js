'use strict';

const fs = require('fs');
const path = require('path');
const util = require('util');
const childProcess = require('child_process');

const fse = require('fs-extra');

const Log = require('./Log');

const exec = util.promisify(childProcess.exec);

const SUPPORTED = ['npm', 'pnpm'];

const REASONS = {
  PACKAGE_MANAGER_FIELD: 'packageManager-field',
  PNPM_LOCKFILE: 'pnpm-lockfile',
  NPM_LOCKFILE: 'npm-lockfile',
  AMBIGUOUS_LOCKFILES: 'ambiguous-lockfiles',
  DEFAULT: 'default',
};

const ERROR_CODES = Object.freeze({
  PM_NOT_INSTALLED: 'PM_NOT_INSTALLED',
});

function parsePackageManagerField(value) {
  if (typeof value !== 'string') return null;
  const at = value.indexOf('@');
  const name = (at === -1 ? value : value.slice(0, at)).trim();
  return SUPPORTED.includes(name) ? name : null;
}

function readPackageManagerField(appPath) {
  try {
    const pkg = fse.readJsonSync(path.join(appPath, 'package.json'));
    return parsePackageManagerField(pkg && pkg.packageManager);
  } catch (err) {
    return null;
  }
}

class PackageManager {
  /**
   * Resolve which package manager an app uses, with the reason for the choice.
   * @param {string} appPath
   * @returns {Promise<{name: 'npm' | 'pnpm', reason: string}>}
   */
  static async detect(appPath) {
    const field = readPackageManagerField(appPath);
    if (field) {
      return { name: field, reason: REASONS.PACKAGE_MANAGER_FIELD };
    }

    const hasPnpmLock = fs.existsSync(path.join(appPath, 'pnpm-lock.yaml'));
    const hasNpmLock = fs.existsSync(path.join(appPath, 'package-lock.json'));

    if (hasPnpmLock && hasNpmLock) {
      // Soft fallback to npm so existing apps with dual lockfiles keep working.
      // The reason is carried so callers (and error messages) can react if needed.
      return { name: 'npm', reason: REASONS.AMBIGUOUS_LOCKFILES };
    }
    if (hasPnpmLock) return { name: 'pnpm', reason: REASONS.PNPM_LOCKFILE };
    if (hasNpmLock) return { name: 'npm', reason: REASONS.NPM_LOCKFILE };

    // No signal — if exactly one supported manager is installed, prefer it.
    const installed = await PackageManager.detectInstalled();
    return installed.length === 1
      ? { name: installed[0].name, reason: REASONS.DEFAULT }
      : { name: 'npm', reason: REASONS.DEFAULT };
  }

  static async for(appPath) {
    const { name, reason } = await PackageManager.detect(appPath);
    return new PackageManager(appPath, name, reason);
  }

  /**
   * Parse JSON from stdout, slicing past any leading non-JSON noise (pnpm's
   * deps-status output that `--silent` does not fully suppress).
   * @param {string} stdout
   * @param {'{' | '['} opener - `'{'` for object output, `'['` for array output.
   * @returns {any}
   */
  static parseJsonTolerant(stdout, opener) {
    const start = stdout.indexOf(opener);
    if (start === -1) {
      const shape = opener === '[' ? 'array' : 'object';
      throw new Error(`no JSON ${shape} found in stdout: ${stdout}`);
    }
    return JSON.parse(stdout.slice(start));
  }

  /**
   * Probe for installed package managers by running `<pm> --version`. Returns
   * one entry per manager whose probe succeeded.
   * @param {Function} [probe=exec] - Replaceable command runner (mainly for tests).
   * @returns {Promise<Array<{name: string, version: string}>>}
   */
  static async detectInstalled(probe = exec) {
    const results = await Promise.all(
      SUPPORTED.map(async (name) => {
        try {
          const { stdout } = await probe(`${name} --version`);
          return { name, version: stdout.trim() };
        } catch {
          return null;
        }
      }),
    );
    return results.filter(Boolean);
  }

  constructor(appPath, name, reason = REASONS.DEFAULT) {
    this.appPath = appPath;
    this.name = name;
    this.reason = reason;
  }

  async _exec(command) {
    try {
      return await exec(command, { cwd: this.appPath });
    } catch (err) {
      if (this._isMissingBinaryError(err)) {
        const friendly = new Error(this._missingBinaryMessage());
        friendly.code = ERROR_CODES.PM_NOT_INSTALLED;
        friendly.pmName = this.name;
        throw friendly;
      }
      // Surface stderr/stdout — exec()'s default `.message` is just "Command failed: <cmd>".
      const detail = [err.stderr, err.stdout]
        .map((s) => (s || '').trim())
        .filter(Boolean)
        .join('\n');
      if (detail) err.message = `${err.message}\n${detail}`;
      throw err;
    }
  }

  _isMissingBinaryError(err) {
    if (!err) return false;
    if (err.code === 'ENOENT') return true;
    const text = `${err.stderr || ''}${err.message || ''}`.toLowerCase();
    return (
      text.includes('is not recognized') ||
      text.includes('command not found') ||
      text.includes(`'${this.name}' is not`) ||
      text.includes(`"${this.name}" is not`)
    );
  }

  _missingBinaryMessage() {
    switch (this.reason) {
      case REASONS.PACKAGE_MANAGER_FIELD:
        return (
          `This app's \`packageManager\` field in \`package.json\` is set to \`${this.name}\`, but \`${this.name}\` is not installed or not on PATH. ` +
          `Install \`${this.name}\` or change the field.`
        );
      case REASONS.PNPM_LOCKFILE:
        return (
          'This app has a `pnpm-lock.yaml`, so the CLI tried to use `pnpm` — but `pnpm` is not installed or not on PATH. ' +
          'Install `pnpm`, or set the `packageManager` field in `package.json` to switch to a different manager.'
        );
      case REASONS.NPM_LOCKFILE:
        return (
          'This app has a `package-lock.json`, so the CLI tried to use `npm` — but `npm` is not installed or not on PATH. ' +
          'Install `npm`, or set the `packageManager` field in `package.json` to switch to a different manager.'
        );
      case REASONS.AMBIGUOUS_LOCKFILES:
        return (
          'Both `pnpm-lock.yaml` and `package-lock.json` exist in this app. The CLI defaulted to `npm` — but `npm` is not installed or not on PATH. ' +
          'Set the `packageManager` field in `package.json`, or delete the unused lockfile.'
        );
      case REASONS.DEFAULT:
      default:
        return (
          'No package manager is configured for this app (no `pnpm-lock.yaml`, no `package-lock.json`, no `packageManager` field in `package.json`), so the CLI defaulted to `npm` — but `npm` is not installed or not on PATH. ' +
          'Install `npm` or `pnpm`, then either run an install in your app to create a lockfile or set the `packageManager` field in `package.json`.'
        );
    }
  }

  async install(packages) {
    Log.success(`Installing dependencies: ${packages.join(', ')}`);
    const cmd =
      this.name === 'pnpm'
        ? `pnpm add ${packages.join(' ')}`
        : `npm install --save ${packages.join(' ')}`;
    await this._exec(cmd);
    Log.success('Installation complete');
  }

  async installDev(packages) {
    Log.success(`Installing dev dependencies: ${packages.join(', ')}`);
    const cmd =
      this.name === 'pnpm'
        ? `pnpm add -D ${packages.join(' ')}`
        : `npm install --save-dev ${packages.join(' ')}`;
    await this._exec(cmd);
    Log.success('Installation complete');
  }

  async installAll() {
    await this._exec(this.name === 'pnpm' ? 'pnpm install' : 'npm install');
  }

  async uninstall(packages, { dev = false } = {}) {
    let cmd;
    if (this.name === 'pnpm') {
      cmd = `pnpm remove${dev ? ' -D' : ''} ${packages.join(' ')}`;
    } else {
      cmd = `npm uninstall${dev ? ' -D' : ''} ${packages.join(' ')}`;
    }
    await this._exec(cmd);
  }

  async list() {
    const result = await this._exec(this.name === 'pnpm' ? 'pnpm list' : 'npm list');
    return result.stdout;
  }

  async run(script) {
    return this._exec(this.name === 'pnpm' ? `pnpm run ${script}` : `npm run ${script}`);
  }

  async exec(command) {
    // `--silent` suppresses pnpm's deps-status output before `pnpm exec`, but
    // only partially; callers that parse stdout should use parseJsonTolerant.
    return this._exec(this.name === 'pnpm' ? `pnpm --silent exec ${command}` : `npx ${command}`);
  }

  async copyProductionDependencies(buildPath) {
    if (this.name === 'pnpm') {
      return this._copyProductionDependenciesPnpm(buildPath);
    }
    return this._copyProductionDependenciesNpm(buildPath);
  }

  async _copyProductionDependenciesNpm(buildPath) {
    // npm@7+ lists what is in node_modules (may include extras not in package.json).
    // `--package-lock-only` would constrain that but throws when no lockfile exists.
    const { stdout } = await this._exec('npm ls --parseable --all --only=prod');

    const dependencies = stdout
      .split(/\r?\n/)
      .map((filePath) => path.relative(this.appPath, filePath))
      .filter((filePath) => filePath !== '');

    for (const relPath of dependencies) {
      const fullSrc = path.join(this.appPath, relPath);
      const fullDest = path.join(buildPath, relPath);

      await fse.copy(fullSrc, fullDest, {
        filter(src) {
          // Skip nested node_modules; any needed sub-dep is itself listed by `npm ls`.
          const subPath = src.replace(fullSrc, '');
          return subPath.startsWith('node_modules', 1) === false;
        },
      });
    }
  }

  async _copyProductionDependenciesPnpm(buildPath) {
    const { stdout } = await this._exec('pnpm ls --json --depth=Infinity --prod');
    const deps = this._collectPnpmProdDeps(stdout);

    for (const { srcPath, relPath } of deps) {
      const fullDest = path.join(buildPath, relPath);
      await fse.copy(srcPath, fullDest, {
        dereference: true,
        filter(src) {
          // Skip the nested node_modules symlink farm pnpm leaves inside each package.
          const sub = src.slice(srcPath.length);
          return !sub.startsWith(path.sep + 'node_modules');
        },
      });
    }
  }

  /**
   * Walk a `pnpm ls --json --depth=Infinity --prod` tree and emit one entry per
   * placed package with an npm-style relative path: hoisted at `node_modules/<name>`
   * when free, otherwise nested under the conflicting parent.
   * @param {string} stdout
   * @returns {Array<{srcPath: string, relPath: string}>}
   */
  _collectPnpmProdDeps(stdout) {
    const parsed = PackageManager.parseJsonTolerant(stdout, '[');

    const topLevelSrc = new Map();
    const placed = new Map();

    const visit = (deps, parentRelPath) => {
      if (!deps) return;
      for (const [name, info] of Object.entries(deps)) {
        if (!info?.path) continue;

        // Identity is `info.path`: pnpm's `.pnpm/<name>@<ver>_<peer-hash>/...` is
        // unique per resolved variant, so a path mismatch means a real conflict.
        const topSrc = topLevelSrc.get(name);
        let relPath;
        if (topSrc === undefined) {
          relPath = path.join('node_modules', name);
          topLevelSrc.set(name, info.path);
        } else if (topSrc === info.path) {
          relPath = path.join('node_modules', name);
        } else {
          relPath = path.join(parentRelPath, 'node_modules', name);
        }

        if (placed.has(relPath)) continue;
        placed.set(relPath, info.path);
        visit(info.dependencies, relPath);
        visit(info.optionalDependencies, relPath);
      }
    };

    // Walk only `dependencies` and `optionalDependencies`. `pnpm ls` also emits
    // `unsavedDependencies` (packages present in node_modules but not managed
    // by pnpm — e.g. hand-placed directories) which must not be bundled.
    for (const root of Array.isArray(parsed) ? parsed : [parsed]) {
      visit(root.dependencies, '');
      visit(root.optionalDependencies, '');
    }

    return [...placed].map(([relPath, srcPath]) => ({ srcPath, relPath }));
  }
}

PackageManager.ERROR_CODES = ERROR_CODES;

module.exports = PackageManager;
