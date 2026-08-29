import Log from '../../../lib/Log.js';
import AppFactory from '../../../lib/AppFactory.js';
import AthomApi from '../../../services/AthomApi.js';
import {
  createHomeyApiClient,
  disposeHomeyApiClient,
} from '../../../lib/api/ApiCommandRuntime.mjs';
import { shouldUseContextResolution } from '../../../lib/EffectiveContextResolver.mjs';

async function resolveHomey(argv) {
  const usesContextResolution = await shouldUseContextResolution(argv);

  if (!usesContextResolution) {
    return await AthomApi.getActiveHomey();
  }

  return await createHomeyApiClient({
    context: argv.context,
    auth: argv.auth,
  });
}

export const desc = 'Install a Homey App';
export const builder = (yargs) => {
  return yargs
    .option('clean', {
      alias: 'c',
      type: 'boolean',
      default: false,
    })
    .option('skip-build', {
      alias: 's',
      type: 'boolean',
      default: false,
    });
};
export const handler = async (yargs) => {
  let homey = null;
  let exitCode = 0;

  try {
    homey = await resolveHomey(yargs);
    const app = AppFactory.getAppInstance(yargs.path);
    await app.install({
      homey,
      clean: yargs.clean,
      skipBuild: yargs.skipBuild,
    });
  } catch (err) {
    if (err instanceof Error && err.stack) {
      Log.error(err.stack);
    } else {
      Log.error(err);
    }
    exitCode = 1;
  } finally {
    if (homey?.__homeyCliEffectiveContext) {
      await disposeHomeyApiClient(homey);
    }
  }

  process.exit(exitCode);
};
