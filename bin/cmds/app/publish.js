'use strict';

const colors = require('colors');
const { Log } = require('../../..');
const { App } = require('../../..');

exports.desc = 'Publish a Homey App to the Homey Apps Store';
exports.handler = async yargs => {
  const appPath = yargs.path || process.cwd();

  try {
    const app = new App(appPath);
    await app.publish();
  } catch (err) {
    Log(colors.red(err.message));
  }
};
