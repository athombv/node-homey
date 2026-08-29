import {
  applyContextOutputOptions,
  logManagementError,
  printContext,
} from '../../../lib/ContextCommandSupport.mjs';
import CliState from '../../../services/CliState.js';

export const command = 'inspect <name>';
export const desc = 'Inspect a redacted Homey context';

export const builder = (yargs) => {
  return applyContextOutputOptions(yargs).positional('name', {
    type: 'string',
    description: 'Context name',
  });
};

export const handler = async (argv) => {
  try {
    const context = await CliState.getContext(argv.name);

    if (!context) {
      throw new Error(`Context does not exist: ${argv.name}`);
    }

    printContext(context, argv);
    process.exit(0);
  } catch (err) {
    logManagementError(err, argv);
    process.exit(1);
  }
};
