'use strict';

exports.desc = 'Show the active Homey';
exports.handler = async () => {
  // eslint-disable-next-line node/no-unsupported-features/es-syntax, import/extensions
  const cmd = await import('./current.mjs');
  return cmd.default();
};
