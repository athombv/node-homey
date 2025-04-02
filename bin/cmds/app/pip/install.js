'use strict';

const Log = require('../../../../lib/Log');
const AppFactory = require('../../../../lib/AppFactory');
const AppPython = require('../../../../lib/AppPython');

exports.command = 'install [packages...]';
exports.desc = 'Install a project dependency (Python only) \n Without arguments, installs all defined dependencies from `app.json`';
exports.builder = yargs => {
  return yargs
    .positional('packages', {
      type: 'string',
      desc: 'One or multiple packages to install, surrounded by quotes (") and divided by a space.',
    })
    .help();
};
exports.handler = async yargs => {
  try {
    const appInstance = AppFactory.getAppInstance(yargs.path);

    if (!(appInstance instanceof AppPython)) throw Error('Pip install is only allowed for Python Apps.');

    await AppPython.pipInstall({
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
