'use strict';

const open = require('open');
const { Log } = require('../..');
const config = require('../../config.js');

exports.desc = 'Open Homey Developer Documentation';
exports.handler = async yargs => {
  try {
    open(config.homeyDocsUrl);
    process.exit();
  } catch (err) {
    Log(err);
  }
};
