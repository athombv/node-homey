'use strict';

exports.desc = 'Select a Homey as active with Ink UI';
exports.builder = (yargs) => {
  return yargs.option('local', {
    alias: 'l',
    type: 'boolean',
    default: false,
    desc: 'Include local USB discovery scan (slower)',
  });
};

exports.handler = async (yargs) => {
  // eslint-disable-next-line node/no-unsupported-features/es-syntax, import/extensions
  const cmd = await import('./new.mjs');
  return cmd.default(yargs);
};
