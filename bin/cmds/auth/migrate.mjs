import {
  applyContextOutputOptions,
  logManagementError,
  printAuthenticationProfile,
} from '../../../lib/ContextCommandSupport.mjs';
import CliState from '../../../services/CliState.js';

export const command = 'migrate <profile>';
export const desc = 'Explicitly migrate persistent OAuth credential storage';

export const builder = (yargs) => {
  return applyContextOutputOptions(yargs)
    .positional('profile', { type: 'string', description: 'Authentication profile name' })
    .option('to', {
      choices: ['settings', 'keychain'],
      demandOption: true,
      description: 'Destination credential store',
    });
};

export const handler = async (argv) => {
  try {
    const profile = await CliState.migrateAuthenticationProfile(argv.profile, argv.to);

    printAuthenticationProfile(profile, argv);
    process.exit(0);
  } catch (err) {
    logManagementError(err, argv);
    process.exit(1);
  }
};
