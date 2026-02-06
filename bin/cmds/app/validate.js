'use strict';

const Log = require('../../../lib/Log');
const AppFactory = require('../../../lib/AppFactory');

exports.desc = 'Validate a Homey App';
exports.builder = (yargs) => {
  return yargs
    .option('level', {
      alias: 'l',
      default: 'publish',
      type: 'string',
      description: 'Validation level. Can be: debug, publish, verified.',
    })
    .option('docker-socket-path', {
      default: undefined,
      type: 'string',
      description: 'Path to the Docker socket.',
    })
    .option('find-links', {
      default: undefined,
      type: 'string',
      desc: 'Additional location to search for candidate Python package distributions',
    });
};
exports.handler = async (yargs) => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.preprocess({
      ...yargs,
      copyAppProductionDependencies: true,
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
