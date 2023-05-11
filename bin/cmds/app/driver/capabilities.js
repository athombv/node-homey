'use strict';

const colors = require('colors');
const { Log } = require('../../../..');
const { App } = require('../../../..');

exports.desc = 'Change the capabilities of a Driver';
exports.handler = async yargs => {
  try {
    const app = new App(yargs.path);
    await app.changeDriverCapabilities();
    process.exit(0);
  } catch (err) {
    Log(colors.red(err.message));
    process.exit(1);
  }
};
