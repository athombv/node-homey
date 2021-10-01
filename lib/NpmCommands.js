'use strict';

const path = require('path');
const util = require('util');
const childProcess = require('child_process');

const colors = require('colors');

const { Log } = require('..');

const exec = util.promisify(childProcess.exec);

class NpmCommands {

  /**
   * Execute npm install for a given packageId or array of packageIds.
   * @param {string[]} packages - List of packages that should be installed (e.g. ['request'] or ['request@1.2.3'])
   * @param {{ appPath?: string }} [options] - Current working directory where npm install should be executed.
   * @returns {Promise<void>}
   */
  static async install(packages, { appPath } = {}) {
    Log(colors.green(`✓ Installing dependencies: ${packages.join(', ')}`));
    await exec(`npm install --save ${packages.join(' ')}`, { cwd: appPath });
    Log(colors.green('✓ Installation complete'));
  }

  /**
   * Execute npm install for a given packageId or array of packageIds.
   * @param {string[]} packages - List of packages that should be installed (e.g. ['request'] or ['request@1.2.3'])
   * @param {{ appPath?: string }} [options] - Current working directory where npm install should be executed.
   * @returns {Promise<void>}
   */
  static async installDev(packages, { appPath } = {}) {
    Log(colors.green(`✓ Installing dev dependencies: ${packages.join(', ')}`));
    await exec(`npm install --save-dev ${packages.join(' ')}`, { cwd: appPath });
    Log(colors.green('✓ Installation complete'));
  }

  /**
   * Execute npm ls to get a list of production dependencies.
   * @param {{ appPath?: string }} [options]
   * @returns {Promise<string[]>}
   */
  static async getProductionDependencies({ appPath } = {}) {
    // node-homey has installed npm 6 as a dependency so we can resolve it
    const nodeHomeyNPMPath = require.resolve('npm');

    // Note: if we ever upgrade to npm@7 this command will also list packages that are on disk
    // but no longer in the package.json or package-lock.json. We can add the --package-lock-only
    // flag to prevent this but then it will throw when there is no lock file.
    const { stdout } = await exec(`node ${nodeHomeyNPMPath} ls --parseable --all --only=prod`, { cwd: appPath });

    return stdout
      .split('\n')
      .map(filePath => path.relative(appPath, filePath))
      .filter(filePath => filePath !== '');
  }

}

module.exports = NpmCommands;
