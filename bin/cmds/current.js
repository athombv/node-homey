'use strict';

const Log = require('../../lib/Log');
const AthomApi = require('../../services/AthomApi');

exports.desc = 'Show the active Homey';
exports.handler = async () => {
  try {
    const activeHomey = await AthomApi.getSelectedHomey();

    if (!activeHomey) {
      Log('No active Homey selected. Run `homey select` to choose one.');
      process.exit(0);
    }

    Log(`Active Homey: ${activeHomey.name} (${activeHomey.id})`);
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
