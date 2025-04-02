'use strict';

const Log = require('../../../lib/Log');
const AppFactory = require('../../../lib/AppFactory');
const AppPython = require('../../../lib/AppPython');
const { HOMEY_PLATFORMS } = require('../../../lib/constants');

exports.desc = 'Build a Homey App for publishing';
exports.handler = async yargs => {
  try {
    const app = AppFactory.getAppInstance(yargs.path);

    if (app instanceof AppPython) {
      await app.build({
        platform: HOMEY_PLATFORMS.ALL,
      });
    } else {
      await app.build();
    }

    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
