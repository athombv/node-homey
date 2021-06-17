'use strict';

const open = require('open');
const { Log } = require('../..');
const config = require('../../config.js');

exports.desc = 'Open Homey Developer Tools';
exports.handler = async yargs => {
  try {
    open(config.homeyDevToolsUrl);
    process.exit();
  } catch (err) {
    Log(err);
  }
};
