'use strict';

const Log = require('../../../lib/Log');
const App = require('../../../lib/App');

exports.command = 'version <next>';
exports.desc = 'Update a Homey App\'s version';
exports.builder = yargs => {
  return yargs.positional('next', {
    describe: 'patch/minor/major or semver',
    type: 'string',
  });
};
exports.handler = async yargs => {
  try {
    const app = new App(yargs.path);
    await app.version(yargs.next);
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
