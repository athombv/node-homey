'use strict';

exports.desc = 'Dependency related commands (Python only)';
exports.builder = yargs => {
  return yargs
    .commandDir('dependencies')
    .option('find-links', {
      type: 'string',
      desc: 'Additional location to search for candidate package distributions',
    })
    .demandCommand()
    .help();
};
