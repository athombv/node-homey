import {
  applyContextOutputOptions,
  logManagementError,
  printAuthenticationProfile,
} from '../../../lib/ContextCommandSupport.mjs';
import { CliState } from '../../../services/CliState.mjs';

export const command = 'rename <from> <to>';
export const desc = 'Rename an authentication profile and update context references';

export const builder = (yargs) => {
  return applyContextOutputOptions(yargs)
    .positional('from', { type: 'string', description: 'Existing profile name' })
    .positional('to', { type: 'string', description: 'New profile name' });
};

export const handler = async (argv) => {
  try {
    const profile = await CliState.renameAuthenticationProfile(argv.from, argv.to);

    printAuthenticationProfile(profile, argv);
    process.exit(0);
  } catch (err) {
    logManagementError(err, argv);
    process.exit(1);
  }
};
