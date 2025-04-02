'use strict';

const Log = require('../../../../lib/Log');
const AppFactory = require('../../../../lib/AppFactory');
const AppPython = require('../../../../lib/AppPython');

exports.command = 'uninstall <packages...>';
exports.desc = 'Uninstall a project dependency (Python only)';
exports.builder = yargs => {
  return yargs
    .positional('packages', {
      type: 'string',
      desc: 'One or multiple packages to uninstall, surrounded by quotes (") and divided by a space.',
    })
    .help();
};
exports.handler = async yargs => {
  try {
    const appInstance = AppFactory.getAppInstance(yargs.path);

    if (!(appInstance instanceof AppPython)) throw Error('Pip uninstall is only allowed for Python Apps.');

    await AppPython.pipUninstall({
      appPath: yargs.path,
      packages: yargs.packages,
      executable: yargs.python,
    });

    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
