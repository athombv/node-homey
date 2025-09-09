'use strict';

const Log = require('../../../../lib/Log');
const AppFactory = require('../../../../lib/AppFactory');

exports.desc = 'List the dependencies of a Python Homey app';
exports.handler = async yargs => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.listDependencies();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
