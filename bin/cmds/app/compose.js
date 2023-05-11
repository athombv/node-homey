'use strict';

const colors = require('colors');
const { Log } = require('../../..');
const { App } = require('../../..');

exports.desc = 'Migrate app to Homey compose';
exports.handler = async yargs => {
  try {
    const app = new App(yargs.path);
    await app.migrateToCompose();
    process.exit(0);
  } catch (err) {
    Log(colors.red(err.message));
    process.exit(1);
  }
};
