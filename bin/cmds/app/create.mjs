import Log from '../../../lib/Log.js';
import AppFactory from '../../../lib/AppFactory.js';

export const desc = 'Create a new Homey App';

function ensureInteractiveTerminal() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

export const AppCreateCommandHelpers = {
  async createAppWithAnswers({ answers, appPath }) {
    return AppFactory.createNewAppInstance({
      answers,
      appPath,
    });
  },
  async promptCreateApp({ appPath }) {
    return AppFactory.createNewAppInstance({ appPath });
  },
  async runInteractiveCreateWizard() {
    const { renderHomeyAppCreateRuntime } =
      await import('../../../lib/ui/homey-app-create/homey-app-create-runtime.mjs');

    return renderHomeyAppCreateRuntime({
      questionGroups: AppFactory.getCreateNewAppQuestionGroups(),
    });
  },
};

export const handler = async (yargs) => {
  try {
    if (!ensureInteractiveTerminal()) {
      await AppCreateCommandHelpers.promptCreateApp({ appPath: yargs.path });
      process.exit(0);
      return;
    }

    const result = await AppCreateCommandHelpers.runInteractiveCreateWizard();

    if (result.status === 'cancelled') {
      Log.warning('App creation cancelled.');
      process.exit(1);
      return;
    }

    await AppCreateCommandHelpers.createAppWithAnswers({
      answers: result.answers,
      appPath: yargs.path,
    });

    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
