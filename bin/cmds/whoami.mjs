'use strict';

import colors from 'colors';
import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';

export const desc = 'Show the current logged in user';
export const handler = async () => {
  try {
    const profile = await AthomApi.getProfile();
    Log(`${profile.firstname} ${profile.lastname} <${profile.email}>`);

    if (profile.hasRole('app_developer_trusted')) {
      Log(`${colors.cyan('(✔)')} ${colors.white('Verified Developer')}`);
    }

    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
