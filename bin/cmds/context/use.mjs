import {
  applyContextOutputOptions,
  logManagementError,
  printContext,
} from '../../../lib/ContextCommandSupport.mjs';
import { CliState } from '../../../services/CliState.mjs';

export const command = 'use <name>';
export const desc = 'Set the current Homey context';

export const builder = (yargs) => {
  return applyContextOutputOptions(yargs).positional('name', {
    type: 'string',
    description: 'Context name',
  });
};

export const handler = async (argv) => {
  try {
    const context = await CliState.useContext(argv.name);

    if (context.health.status !== 'ready') {
      console.error(
        `Warning: context ${argv.name} is ${context.health.status}: ${context.health.reasons.join(' ')}`,
      );
    }

    printContext(context, argv);
    process.exit(0);
  } catch (err) {
    logManagementError(err, argv);
    process.exit(1);
  }
};
