'use strict';

const Log = require('../../../lib/Log');
const App = require('../../../lib/App');

exports.desc = 'Create a new Homey App';
exports.builder = yargs => {
  return yargs.option('type', {
    default: 'commonjs',
    type: 'string',
    description: 'Module format type. Can be: module, commonjs.',
  });
};
exports.handler = async yargs => {
  try {
    await App.create({ appPath: yargs.path, type: yargs.type });
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
