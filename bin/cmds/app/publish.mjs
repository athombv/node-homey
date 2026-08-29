import Log from '../../../lib/Log.js';
import AppFactory from '../../../lib/AppFactory.js';
import { resolveCommandContext } from '../../../lib/EffectiveContextResolver.mjs';

async function resolveAccountClient(argv) {
  const resolution = await resolveCommandContext(argv, { scope: 'account' });

  if (!resolution.usesContextResolution) {
    return null;
  }

  return resolution.accountClient;
}

export const desc = 'Publish a Homey App to the Homey Apps Store';
export const builder = (yargs) => {
  return yargs
    .option('docker-socket-path', {
      default: undefined,
      type: 'string',
      description: 'Path to the Docker socket.',
    })
    .option('find-links', {
      default: undefined,
      type: 'string',
      desc: 'Additional location to search for candidate Python package distributions',
    });
};
export const handler = async (yargs) => {
  try {
    const accountClient = await resolveAccountClient(yargs);
    const app = AppFactory.getAppInstance(yargs.path);
    await app.publish({
      dockerSocketPath: yargs.dockerSocketPath,
      findLinks: yargs.findLinks,
      ...(accountClient ? { athomApi: accountClient } : {}),
    });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
