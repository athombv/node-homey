/* eslint-disable no-process-exit */

'use strict';

const opn = require('opn');
const { Log } = require('../..');
const config = require('../../config.js');

exports.desc = 'Open Homey Developer Tools';
exports.handler = async yargs => {
  try {
    opn(config.homeyDevToolsUrl);
    process.exit();
  } catch (err) {
    Log(err);
  }
};
