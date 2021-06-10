'use strict';

const colors = require('colors');
const { Log } = require('../../..');
const { App } = require('../../..');

exports.desc = 'Build a Homey App for publishing';
exports.handler = async yargs => {
  const appPath = yargs.path || process.cwd();

  try {
    const app = new App(appPath);
    await app.build();
  } catch (err) {
    Log(colors.red(err.message));
  }
};
