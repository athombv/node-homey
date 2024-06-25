'use strict';

const Log = require('../../../lib/Log');
const App = require('../../../lib/App');

exports.desc = 'Migrate all i18n strings from separate files to a single ./homycompose/locales/<language>.json';
exports.handler = async yargs => {
  try {
    const app = new App(yargs.path);
    await app.migrateLocales();
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
