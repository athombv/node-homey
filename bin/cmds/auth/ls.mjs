import {
  applyContextOutputOptions,
  logManagementError,
  printAuthenticationProfiles,
} from '../../../lib/ContextCommandSupport.mjs';
import { CliState } from '../../../services/CliState.mjs';

export const command = 'ls';
export const aliases = ['list'];
export const desc = 'List authentication profiles';

export const builder = (yargs) => {
  return applyContextOutputOptions(yargs).help();
};

export const handler = async (argv = {}) => {
  try {
    const profiles = await CliState.listAuthenticationProfiles();

    printAuthenticationProfiles(profiles, argv);
    process.exit(0);
  } catch (err) {
    logManagementError(err, argv);
    process.exit(1);
  }
};
