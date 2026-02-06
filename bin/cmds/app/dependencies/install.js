'use strict';

const Log = require('../../../../lib/Log');
const AppFactory = require('../../../../lib/AppFactory');

exports.desc = 'Install the dependencies of a Homey app';
exports.handler = async (yargs) => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.installDependencies({
      dockerSocketPath: yargs.dockerSocketPath,
      findLinks: yargs.findLinks,
    });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
