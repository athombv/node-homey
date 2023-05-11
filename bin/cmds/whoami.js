'use strict';

const colors = require('colors');
const { Log } = require('../..');
const { AthomApi } = require('../..');

exports.desc = 'Show the current logged in user';
exports.handler = async yargs => {
  try {
    const profile = await AthomApi.getProfile();
    Log(`${profile.firstname} ${profile.lastname} <${profile.email}>`);

    if (profile.roleIds.includes('app_developer_trusted')) {
      Log(`${colors.cyan('(✔)')} ${colors.white('Verified Developer')}`);
    }

    // eslint-disable-next-line no-process-exit
    process.exit();
  } catch (err) {
    Log(colors.red(err.message));
  }
};
