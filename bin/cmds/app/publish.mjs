import Log from '../../../lib/Log.js';
import AppFactory from '../../../lib/AppFactory.js';

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
    })
    .option('slim', {
      type: 'boolean',
      default: false,
      desc: 'Remove .d.ts, .d.mts, .d.cts and .map files from node_modules to reduce app size',
    });
};
export const handler = async (yargs) => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.publish({
      dockerSocketPath: yargs.dockerSocketPath,
      findLinks: yargs.findLinks,
      slim: yargs.slim,
    });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
