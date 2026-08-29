import { printStructuredOutput } from '../../../lib/CliOutput.mjs';
import {
  applyContextOutputOptions,
  logManagementError,
} from '../../../lib/ContextCommandSupport.mjs';
import Log from '../../../lib/Log.js';
import { CliState } from '../../../services/CliState.mjs';

export const command = 'storage [backend]';
export const desc = 'Show or set the default credential store for new credentials';

export const builder = (yargs) => {
  return applyContextOutputOptions(yargs).positional('backend', {
    choices: ['settings', 'keychain'],
    description: 'Default store for credentials created afterward',
  });
};

export const handler = async (argv) => {
  try {
    const backend = argv.backend
      ? await CliState.setDefaultCredentialStore(argv.backend)
      : await CliState.getDefaultCredentialStore();

    printStructuredOutput({
      value: { defaultStore: backend },
      argv,
      printHuman: () => {
        Log(`Default credential store: ${backend}`);
      },
    });
    process.exit(0);
  } catch (err) {
    logManagementError(err, argv);
    process.exit(1);
  }
};
