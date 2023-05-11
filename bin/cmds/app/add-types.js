'use strict';

const colors = require('colors');
const { Log } = require('../../..');
const { App } = require('../../..');

exports.desc = 'Install the Apps SDK TypeScript declarations';
exports.handler = async yargs => {
  try {
    await App.addTypes({ appPath: yargs.path });
    process.exit(1);
  } catch (err) {
    Log(colors.red(err.message));
    process.exit(0);
  }
};
