'use strict';

const colors = require('colors');
const { Log } = require('../../../..');
const { App } = require('../../../..');

exports.desc = 'Create a new Discovery strategy';
exports.handler = async yargs => {
  const appPath = yargs.path || process.cwd();

  try {
    const app = new App(appPath);
    await app.createDiscoveryStrategy();
  } catch (err) {
    Log(colors.red(err.message));
  }
};
