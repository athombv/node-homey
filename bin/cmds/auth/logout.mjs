import { printStructuredOutput } from '../../../lib/CliOutput.mjs';
import {
  applyContextOutputOptions,
  logManagementError,
} from '../../../lib/ContextCommandSupport.mjs';
import Log from '../../../lib/Log.js';
import { AuthenticationProfiles } from '../../../services/AuthenticationProfiles.mjs';

export const command = 'logout <profile>';
export const desc = 'Log out an authentication profile without deleting it';

export const builder = (yargs) => {
  return applyContextOutputOptions(yargs).positional('profile', {
    type: 'string',
    description: 'Authentication profile name',
  });
};

export const handler = async (argv) => {
  try {
    await AuthenticationProfiles.logout(argv.profile);

    printStructuredOutput({
      value: { loggedOut: argv.profile },
      argv,
      printHuman: () => {
        Log(`Logged out authentication profile ${argv.profile}.`);
      },
    });
    process.exit(0);
  } catch (err) {
    logManagementError(err, argv);
    process.exit(1);
  }
};
