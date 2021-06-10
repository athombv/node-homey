'use strict';

const colors = require('colors');
const { Log } = require('../../..');
const { App } = require('../../..');

exports.desc = 'Create a new Homey App';
exports.handler = async yargs => {
  const appPath = yargs.path || process.cwd();

  try {
    await App.create({ appPath });
  } catch (err) {
    Log(colors.red(err.message));
  }
};
