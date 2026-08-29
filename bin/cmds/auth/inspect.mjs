import {
  applyContextOutputOptions,
  logManagementError,
  printAuthenticationProfile,
} from '../../../lib/ContextCommandSupport.mjs';
import CliState from '../../../services/CliState.js';

export const command = 'inspect <profile>';
export const desc = 'Inspect a redacted authentication profile';

export const builder = (yargs) => {
  return applyContextOutputOptions(yargs).positional('profile', {
    type: 'string',
    description: 'Authentication profile name',
  });
};

export const handler = async (argv) => {
  try {
    const profile = await CliState.getAuthenticationProfile(argv.profile);

    if (!profile) {
      throw new Error(`Authentication profile does not exist: ${argv.profile}`);
    }

    printAuthenticationProfile(profile, argv);
    process.exit(0);
  } catch (err) {
    logManagementError(err, argv);
    process.exit(1);
  }
};
