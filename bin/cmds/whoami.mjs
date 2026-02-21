'use strict';

import { createRequire } from 'node:module';
import colors from 'colors';

const require = createRequire(import.meta.url);
const Log = require('../../lib/Log');
const AthomApi = require('../../services/AthomApi');

export default async function handler() {
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
}
