'use strict';

const Log = require('../../../../lib/Log');
const AppFactory = require('../../../../lib/AppFactory');

exports.desc = 'Create a new Widget';
exports.handler = async yargs => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.createWidget();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
