'use strict';

const colors = require('colors');
const { Log } = require('../../..');
const { App } = require('../../..');

exports.desc = 'Migrate app to Homey compose';
exports.handler = async yargs => {
  const appPath = yargs.path || process.cwd();

  try {
    const app = new App(appPath);
    await app.migrateToCompose();
  } catch (err) {
    Log(colors.red(err.message));
  }
};
