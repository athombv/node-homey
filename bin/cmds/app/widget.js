'use strict';

exports.desc = 'Widget related commands';
exports.builder = (yargs) => {
  return yargs
    .commandDir('widget', {
      extensions: ['.js'],
    })
    .demandCommand()
    .help();
};
