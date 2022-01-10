'use strict';

const colors = require('chalk');
const { Log } = require('../..');
const { AthomApi } = require('../..');

exports.desc = 'Log out the current user';
exports.handler = async yargs => {
  try {
    await AthomApi.logout();
  } catch (err) {
    Log(colors.red(err.message));
  }
};
