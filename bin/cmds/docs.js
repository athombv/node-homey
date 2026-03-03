'use strict';

exports.desc = 'Open Homey Developer Documentation';
exports.handler = async (yargs) => {
  // eslint-disable-next-line node/no-unsupported-features/es-syntax, import/extensions
  const cmd = await import('./docs.mjs');
  return cmd.default(yargs);
};
