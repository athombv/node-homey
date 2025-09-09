'use strict';

const Log = require('../../../../lib/Log');
const AppFactory = require('../../../../lib/AppFactory');

exports.desc = 'Remove dependencies from a Python Homey app';
exports.command = 'remove [dev] <dependencies..>';
exports.builder = yargs => {
  return yargs
    .positional('dependencies', {
      type: 'string',
      desc: 'Python packages to remove',
    })
    .positional('dev', {
      type: 'boolean',
      default: false,
      desc: 'Remove dependencies from development',
    })
    .example('homey app dependencies remove --dev homey-stubs');
};
exports.handler = async yargs => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.removeDependencies(yargs);
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
