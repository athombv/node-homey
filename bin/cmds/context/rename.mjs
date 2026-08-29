import {
  applyContextOutputOptions,
  logManagementError,
  printContext,
} from '../../../lib/ContextCommandSupport.mjs';
import CliState from '../../../services/CliState.js';

export const command = 'rename <from> <to>';
export const desc = 'Rename a Homey context';

export const builder = (yargs) => {
  return applyContextOutputOptions(yargs)
    .positional('from', { type: 'string', description: 'Existing context name' })
    .positional('to', { type: 'string', description: 'New context name' });
};

export const handler = async (argv) => {
  try {
    const context = await CliState.renameContext(argv.from, argv.to);

    printContext(context, argv);
    process.exit(0);
  } catch (err) {
    logManagementError(err, argv);
    process.exit(1);
  }
};
