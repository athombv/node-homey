'use strict';

const Log = require('../../../lib/Log');
const App = require('../../../lib/App');

exports.desc = 'Run a Homey App in development mode';
exports.builder = yargs => {
  return yargs
    .option('clean', {
      alias: 'c',
      type: 'boolean',
      default: false,
      desc: 'Delete all userdata, paired devices etc. before running the app.',
    })
    .option('remote', {
      alias: 'r',
      type: 'boolean',
      default: false,
      desc: 'Upload the app to Homey Pro and run remotely, instead of a Docker container on this machine. Defaults to true for Homey Pro 2019 and earlier.',
    })
    .option('skip-build', {
      alias: 's',
      type: 'boolean',
      default: false,
      desc: 'Skip the automatic build step.',
    })
    .option('link-modules', {
      alias: 'l',
      type: 'string',
      default: '',
      desc: 'Provide a comma-separated path to local Node.js modules to link. Only works when running the app inside Docker.',
    })
    .option('network', {
      alias: 'n',
      default: 'bridge',
      type: 'string',
      description: 'Docker network mode. Must match name from `docker network ls`. Only works when running the app inside Docker.',
    })
    .option('widget-host-id', {
      type: 'string',
      description: '',
    })
    .option('widget-host-url', {
      type: 'string',
      description: '',
    })
};
exports.handler = async yargs => {

  console.log(yargs);

  try {
    const app = new App(yargs.path);
    await app.run({
      remote: yargs.remote,
      clean: yargs.clean,
      skipBuild: yargs.skipBuild,
      linkModules: yargs.linkModules,
      network: yargs.network,
      widgetHostId: yargs.widgetHostId,
      widgetHostUrl: yargs.widgetHostUrl,
    });
  } catch (err) {
    if (err instanceof Error && err.stack) {
      Log.error(err.stack);
    } else {
      Log.error(err);
    }
    process.exit(1);
  }
};
