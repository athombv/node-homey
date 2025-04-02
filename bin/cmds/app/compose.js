'use strict';

const Log = require('../../../lib/Log');
const AppFactory = require('../../../lib/AppFactory');

exports.desc = 'Migrate app to Homey compose';
exports.handler = async yargs => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.migrateToCompose();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
