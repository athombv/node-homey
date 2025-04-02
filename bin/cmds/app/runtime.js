'use strict';

const Log = require('../../../lib/Log');
const AppFactory = require('../../../lib/AppFactory');
const AppPython = require('../../../lib/AppPython');

exports.desc = 'Check a Homey App runtime';
exports.handler = async yargs => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);

    if (app instanceof AppPython) {
      Log.info('Python runtime');
    } else {
      Log.info('Node.js runtime');
    }

    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
