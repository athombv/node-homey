'use strict';

exports.desc = 'Open Homey Developer Tools';
exports.handler = async (yargs) => {
  // eslint-disable-next-line node/no-unsupported-features/es-syntax, import/extensions
  const cmd = await import('./tools.mjs');
  return cmd.default(yargs);
};
