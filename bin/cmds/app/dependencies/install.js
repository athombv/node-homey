'use strict';

const Log = require('../../../../lib/Log');
const AppFactory = require('../../../../lib/AppFactory');

exports.desc = 'Install the dependencies of a Python Homey app';
exports.handler = async yargs => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.installDependencies(yargs);
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
