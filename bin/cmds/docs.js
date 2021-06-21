/* eslint-disable no-process-exit */

'use strict';

const opn = require('opn');
const { Log } = require('../..');
const config = require('../../config');

exports.desc = 'Open Homey Developer Documentation';
exports.handler = async yargs => {
  try {
    opn(config.homeyDocsUrl);
    process.exit();
  } catch (err) {
    Log(err);
  }
};
