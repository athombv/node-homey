'use strict';

const colors = require('colors');
const { Log } = require('../..');
const { AthomApi } = require('../..');

exports.desc = 'Log in with an Athom account';
exports.handler = async yargs => {
  try {
    await AthomApi.login();
    process.exit(0);
  } catch (err) {
    Log(colors.red(err.message));
    process.exit(1);
  }
};
