'use strict';

import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';

export const desc = 'Select a Homey as active';
export const builder = (yargs) => {
  yargs
    .option('current', {
      alias: 'c',
      desc: 'Show the currently selected Homey',
      type: 'boolean',
    })
    .option('id', {
      alias: 'i',
      desc: 'ID of the Homey',
      type: 'string',
    })
    .option('name', {
      alias: 'n',
      desc: 'Name of the Homey',
      type: 'string',
    });
};

export const handler = async (yargs) => {
  try {
    if (yargs.current) {
      const activeHomey = await AthomApi.getSelectedHomey();

      if (!activeHomey) {
        Log('No active Homey selected. Run `homey select` to choose one.');
        process.exit(0);
      }

      Log(`Active Homey: ${activeHomey.name} (${activeHomey.id})`);
      process.exit(0);
    }

    await AthomApi.selectActiveHomey({
      id: yargs.id,
      name: yargs.name,
    });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
