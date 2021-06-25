'use strict';

const colors = require('colors');
const { Log } = require('../../..');
const { App } = require('../../..');

exports.desc = 'Run a Homey App in development mode';
exports.builder = yargs => {
  return yargs
    .option('clean', {
      alias: 'c',
      type: 'boolean',
      default: false,
    })
    .option('skip-build', {
      alias: 's',
      type: 'boolean',
      default: false,
    });
};
exports.handler = async yargs => {
  try {
    const app = new App(yargs.path);
    await app.run({
      clean: yargs.clean,
      skipBuild: yargs.skipBuild,
    });
  } catch (err) {
    Log(colors.red(err.message));
  }
};
