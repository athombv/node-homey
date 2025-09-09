'use strict';

const Log = require('../../../lib/Log');
const AppFactory = require('../../../lib/AppFactory');

exports.desc = 'Install the Apps SDK type declarations';
exports.handler = async yargs => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.constructor.addTypes({ appPath: yargs.path });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
