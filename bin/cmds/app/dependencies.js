'use strict';

exports.desc = 'Dependency related commands (Python only)';
exports.builder = (yargs) => {
  return yargs
    .commandDir('dependencies')
    .option('find-links', {
      type: 'string',
      desc: 'Additional location to search for candidate Python package distributions',
    })
    .option('docker-socket-path', {
      default: undefined,
      type: 'string',
      description: 'Path to the Docker socket.',
    })
    .demandCommand()
    .help();
};
