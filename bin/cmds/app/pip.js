'use strict';

exports.desc = 'Manage Python Dependencies (Python Only)';
exports.builder = yargs => {
  return yargs
    .commandDir('pip')
    .demandCommand()
    .help();
};
