'use strict';

const Log = require('../../../../lib/Log');
const AppFactory = require('../../../../lib/AppFactory');

exports.desc = 'Add dependencies to a Python Homey app';
exports.command = 'add [dev] <dependencies..>';
exports.builder = yargs => {
  return yargs
    .positional('dependencies', {
      type: 'string',
      desc: 'Python packages to add, optionally with specifiers such as version constraints',
    })
    .positional('dev', {
      type: 'boolean',
      default: false,
      desc: 'Install dependencies only for development',
    })
    .example('homey app dependencies add --dev homey-stubs>=0.0.0');
};
exports.handler = async yargs => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.addDependencies(yargs);
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
