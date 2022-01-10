'use strict';

const colors = require('chalk');
const { Log } = require('../../../..');
const { App } = require('../../../..');

exports.desc = 'Create a new Flow';
exports.handler = async yargs => {
  try {
    const app = new App(yargs.path);
    await app.createFlow();
  } catch (err) {
    Log(colors.red(err.message));
  }
};
