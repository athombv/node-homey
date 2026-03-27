import Log from '../../../../lib/Log.js';
import AppFactory from '../../../../lib/AppFactory.js';

export const desc = 'Change the capabilities of a Driver';

function ensureInteractiveTerminal() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

export const driverCapabilitiesCommandHelpers = {
  async runInteractiveFlow({ app }) {
    const { runHomeyDriverCapabilitiesRuntime } =
      await import('../../../../lib/ui/homey-driver-capabilities/homey-driver-capabilities-runtime.mjs');

    return runHomeyDriverCapabilitiesRuntime({ app });
  },
};

export const handler = async (yargs) => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);

    if (ensureInteractiveTerminal()) {
      const result = await driverCapabilitiesCommandHelpers.runInteractiveFlow({ app });

      if (result.status === 'cancelled') {
        Log.warning('Driver capability update cancelled.');
        process.exit(1);
        return;
      }

      Log.success(`Driver capabilities updated for \`${result.driver.id ?? result.driverId}\``);
      process.exit(0);
      return;
    }

    await app.changeDriverCapabilities();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
