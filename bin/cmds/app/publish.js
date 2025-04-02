'use strict';

const Log = require('../../../lib/Log');
const AppFactory = require('../../../lib/AppFactory');

exports.desc = 'Publish a Homey App to the Homey Apps Store';
exports.handler = async yargs => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.publish();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
