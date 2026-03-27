import Log from '../../../../lib/Log.js';
import AppFactory from '../../../../lib/AppFactory.js';
import {
  buildDriverCreateConfig,
  runHomeyDriverCreateWizard,
} from '../../../../lib/ui/homey-driver-create/homey-driver-create-config.mjs';

export const desc = 'Create a new Driver';

function ensureInteractiveTerminal() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

export const driverCreateCommandHelpers = {
  buildDriverCreateConfig,
  async runInteractiveCreateWizard({ app }) {
    return runHomeyDriverCreateWizard({
      app,
      title: 'Create a Driver',
    });
  },
};

export const handler = async (yargs) => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);

    if (!ensureInteractiveTerminal()) {
      await app.createDriver();
      process.exit(0);
      return;
    }

    const result = await driverCreateCommandHelpers.runInteractiveCreateWizard({ app });

    if (result.status === 'cancelled') {
      Log.warning('Driver creation cancelled.');
      process.exit(1);
      return;
    }

    await app.createDriverFromConfig(
      driverCreateCommandHelpers.buildDriverCreateConfig(result.answers),
    );
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
