'use strict';

const Log = require('../../../lib/Log');
const AppFactory = require('../../../lib/AppFactory');

exports.desc = 'Create a new Homey App';
exports.handler = async yargs => {
  try {
    await AppFactory.createNewAppInstance({ appPath: yargs.path });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
