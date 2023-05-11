'use strict';

const colors = require('colors');
const { Log } = require('../..');
const { AthomApi } = require('../..');

exports.desc = 'Log out the current user';
exports.handler = async yargs => {
  try {
    await AthomApi.logout();
    process.exit(0);
  } catch (err) {
    Log(colors.red(err.message));
    process.exit(1);
  }
};
