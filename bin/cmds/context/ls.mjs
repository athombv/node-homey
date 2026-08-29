import {
  applyContextOutputOptions,
  logManagementError,
  printContexts,
} from '../../../lib/ContextCommandSupport.mjs';
import { CliState } from '../../../services/CliState.mjs';

export const command = 'ls';
export const aliases = ['list'];
export const desc = 'List Homey contexts';

export const builder = (yargs) => {
  return applyContextOutputOptions(yargs).help();
};

export const handler = async (argv = {}) => {
  try {
    const contexts = await CliState.listContexts();

    printContexts(contexts, argv);
    process.exit(0);
  } catch (err) {
    logManagementError(err, argv);
    process.exit(1);
  }
};
