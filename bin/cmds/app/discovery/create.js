'use strict';

const Log = require('../../../../lib/Log');
const AppFactory = require('../../../../lib/AppFactory');

exports.desc = 'Create a new Discovery strategy';
exports.handler = async yargs => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.createDiscoveryStrategy();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
