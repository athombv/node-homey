import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';
import { applyUsbOption } from '../../lib/UsbOption.mjs';

export const desc = 'Select a Homey as active';
export const builder = (yargs) => {
  return applyUsbOption(yargs)
    .commandDir('select', {
      extensions: ['.mjs'],
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
    })
    .example('$0 select --id <HOMEY_ID>', 'Select a Homey by id')
    .example('$0 select --usb', 'Select a USB-connected Homey; USB mode is not saved')
    .example('$0 select current --json', 'Show the currently selected Homey as JSON')
    .help();
};

export const handler = async (argv) => {
  try {
    await AthomApi.selectActiveHomey({
      id: argv.id,
      name: argv.name,
      usb: argv.usb,
    });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
