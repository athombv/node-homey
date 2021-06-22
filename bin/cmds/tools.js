/* eslint-disable no-process-exit */

'use strict';

const open = require('open');
const colors = require('colors');
const { Log } = require('../..');
const config = require('../../config');

exports.desc = 'Open Homey Developer Tools';
exports.handler = async yargs => {
  try {
    await open(config.homeyDevToolsUrl);
  } catch (err) {
    Log(colors.red(err.message));
  }
};
