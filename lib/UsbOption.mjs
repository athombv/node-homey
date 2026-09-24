export function applyUsbOption(yargs) {
  return yargs.option('usb', {
    type: 'boolean',
    default: process.env.HOMEY_USB === '1',
    global: false,
    description: 'Require USB (or set HOMEY_USB=1); --no-usb uses normal network connections',
  });
}
