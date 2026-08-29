export const desc = 'Manage named Homey target contexts';

export const builder = (yargs) => {
  return yargs
    .commandDir('context', {
      extensions: ['.mjs'],
    })
    .demandCommand()
    .help();
};
