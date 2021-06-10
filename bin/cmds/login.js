'use strict';

const colors = require('colors');
const { Log } = require('../..');
const { AthomApi } = require('../..');

exports.desc = 'Log in with an Athom Account';
exports.handler = async yargs => {
  try {
    await AthomApi.login();
    process.exit();
  } catch (err) {
    Log(colors.red(err.message));
  }
};
