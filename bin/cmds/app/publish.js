'use strict';

const Log = require('../../../lib/Log');
const AppFactory = require('../../../lib/AppFactory');

exports.desc = 'Publish a Homey App to the Homey Apps Store';
exports.builder = (yargs) => {
  return yargs
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
    await app.publish(yargs);
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
