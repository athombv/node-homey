export const desc = 'Manage Athom account authentication profiles';

export const builder = (yargs) => {
  return yargs
    .commandDir('auth', {
      extensions: ['.mjs'],
    })
    .demandCommand()
    .help();
};
