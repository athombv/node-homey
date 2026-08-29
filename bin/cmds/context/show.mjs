import { printStructuredOutput } from '../../../lib/CliOutput.mjs';
import {
  applyContextOutputOptions,
  logManagementError,
} from '../../../lib/ContextCommandSupport.mjs';
import Log from '../../../lib/Log.js';
import { CliState } from '../../../services/CliState.mjs';

export const desc = 'Show the effective context selection';

export const builder = (yargs) => {
  return applyContextOutputOptions(yargs).help();
};

export const handler = async (argv = {}) => {
  try {
    const selection = await CliState.resolveContextSelection(argv.context);
    const output = selection
      ? {
          name: selection.name,
          source: selection.source,
        }
      : null;

    printStructuredOutput({
      value: output,
      argv,
      printHuman: () => {
        if (!output) {
          Log('No current context.');
          return;
        }

        Log(`Current context: ${output.name} (${output.source})`);
      },
    });
    process.exit(0);
  } catch (err) {
    logManagementError(err, argv);
    process.exit(1);
  }
};
