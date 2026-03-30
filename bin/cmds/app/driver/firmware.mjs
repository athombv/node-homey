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
      demandOption: false,
    })
    .option('firmware-file', {
      describe: 'Path to the firmware file',
      type: 'string',
      demandOption: false,
    });
};
export const handler = async (yargs) => {
  try {
    const firmwareFile = yargs.firmwareFile
      ? path.resolve(process.cwd(), yargs.firmwareFile)
      : undefined;

    const app = new App(yargs.path);
    await app.createFirmwareUpdate({
      driverPath: yargs.driver,
      firmwareFile,
    });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
