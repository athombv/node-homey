'use strict';

const Log = require('../../../../lib/Log');
const AppFactory = require('../../../../lib/AppFactory');
const AppPython = require('../../../../lib/AppPython');

exports.desc = 'List all project dependencies (Python only)';
exports.handler = async yargs => {
  try {
    const appInstance = AppFactory.getAppInstance(yargs.path);

    if (!(appInstance instanceof AppPython)) throw Error('Pip list is only allowed for Python Apps.');

    await AppPython.pipList({
      appPath: yargs.path,
    });

    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
