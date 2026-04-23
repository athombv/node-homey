'use strict';

import path from 'path';
import Log from '../../../../lib/Log.js';
import App from '../../../../lib/App.js';

export const desc = 'Add a device firmware update to a Driver';

export const builder = (yargs) => {
  return yargs
    .option('driver', {
      describe: 'Path to the driver to which the firmware update should be added',
      type: 'string',
      demandOption: true,
    })
    .option('firmware', {
      describe: 'Path to a firmware file (can be specified multiple times)',
      type: 'array',
      demandOption: true,
    });
};
export const handler = async (yargs) => {
  try {
    const firmwareFiles = yargs.firmware.map((f) => path.resolve(process.cwd(), f));

    const app = new App(yargs.path);
    await app.createFirmwareUpdate({
      driverPath: yargs.driver,
      firmwareFiles,
    });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
