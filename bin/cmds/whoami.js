'use strict';

exports.desc = 'Show the current logged in user';
exports.handler = async (yargs) => {
  // eslint-disable-next-line node/no-unsupported-features/es-syntax, import/extensions
  const cmd = await import('./whoami.mjs');
  return cmd.default(yargs);
};
