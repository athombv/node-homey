'use strict';

const colors = require('colors');
const { Log } = require('../../..');
const { App } = require('../../..');

exports.desc = 'Build a Homey App for publishing';
exports.handler = async yargs => {
  try {
    const app = new App(yargs.path);
    await app.build();
    process.exit(1);
  } catch (err) {
    Log(colors.red(err.message));
    process.exit(0);
  }
};
