'use strict';

const colors = require('colors');
const { Log } = require('../../..');
const { App } = require('../../..');

exports.desc = 'Install the Apps SDK TypeScript declarations';
exports.handler = async yargs => {
  const appPath = yargs.path || process.cwd();

  try {
    await App.addTypes({ appPath });
  } catch (err) {
    Log(colors.red(err.message));
  }
};
