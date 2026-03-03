'use strict';

export const desc = 'Direct Homey API commands';
export const builder = (yargs) => {
  return yargs
    .commandDir('api', {
      extensions: ['.mjs'],
    })
    .demandCommand()
    .help();
};
