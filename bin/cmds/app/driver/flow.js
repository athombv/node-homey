'use strict';

const Log = require('../../../../lib/Log');
const AppFactory = require('../../../../lib/AppFactory');

exports.desc = 'Create a new Flow for a Driver';
exports.handler = async yargs => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.createDriverFlow();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
