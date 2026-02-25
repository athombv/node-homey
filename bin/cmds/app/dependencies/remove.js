'use strict';

const Log = require('../../../../lib/Log');
const AppFactory = require('../../../../lib/AppFactory');

exports.desc = 'Remove dependencies from a Homey app';
exports.command = 'remove [dev] <dependencies..>';
exports.builder = (yargs) => {
  return yargs
    .positional('dependencies', {
      type: 'string',
      desc: 'Packages to remove',
    })
    .positional('dev', {
      type: 'boolean',
      default: false,
      desc: 'Remove dependencies only for development',
    })
    .example('homey app dependencies remove some-package');
};
exports.handler = async (yargs) => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.removeDependencies({
      dockerSocketPath: yargs.dockerSocketPath,
      findLinks: yargs.findLinks,
      dependencies: yargs.dependencies,
      dev: yargs.dev,
    });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
