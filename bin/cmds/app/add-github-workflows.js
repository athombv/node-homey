'use strict';

const Log = require('../../../lib/Log');
const AppFactory = require('../../../lib/AppFactory');

exports.desc = 'Add GitHub Workflows (validate, update version, publish)';
exports.handler = async yargs => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);
    await app.addGitHubWorkflows({ appPath: yargs.path });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
