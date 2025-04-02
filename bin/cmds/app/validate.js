'use strict';

const Log = require('../../../lib/Log');
const AppFactory = require('../../../lib/AppFactory');

exports.desc = 'Validate a Homey App';
exports.builder = yargs => {
  return yargs.option('level', {
    alias: 'l',
    default: 'publish',
    type: 'string',
    description: 'Validation level. Can be: debug, publish, verified.',
  });
};
exports.handler = async yargs => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.preprocess({
      copyAppProductionDependencies: false,
    });
    await app.validate({
      level: yargs.level,
    });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
