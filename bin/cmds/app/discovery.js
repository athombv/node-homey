'use strict';

exports.desc = 'Discovery related commands';
exports.builder = (yargs) => {
  return yargs
    .commandDir('discovery', {
      extensions: ['.js'],
    })
    .demandCommand()
    .help();
};
