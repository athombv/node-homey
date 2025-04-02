'use strict';

const Log = require('../../../../lib/Log');
const AppFactory = require('../../../../lib/AppFactory');

exports.desc = 'Change the capabilities of a Driver';
exports.handler = async yargs => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.changeDriverCapabilities();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
