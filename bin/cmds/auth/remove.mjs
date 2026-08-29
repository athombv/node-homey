import inquirer from 'inquirer';

import { printStructuredOutput } from '../../../lib/CliOutput.mjs';
import {
  applyContextOutputOptions,
  logManagementError,
} from '../../../lib/ContextCommandSupport.mjs';
import Log from '../../../lib/Log.js';
import CliState from '../../../services/CliState.js';

export const command = 'remove <profile>';
export const aliases = ['rm'];
export const desc = 'Remove an authentication profile without cascading';

export const builder = (yargs) => {
  return applyContextOutputOptions(yargs)
    .positional('profile', { type: 'string', description: 'Authentication profile name' })
    .option('yes', {
      alias: 'y',
      type: 'boolean',
      default: false,
      description: 'Confirm removal non-interactively',
    });
};

async function confirmDependantRemoval(entry, argv) {
  if (entry.referencedBy.length === 0 || argv.yes) {
    return;
  }

  const contexts = entry.referencedBy.join(', ');

  if (!process.stdin.isTTY) {
    throw new Error(
      `Authentication profile ${entry.name} is referenced by ${contexts}. Re-run with --yes to leave those contexts broken.`,
    );
  }

  const prompt = inquirer.createPromptModule({
    input: process.stdin,
    output: process.stderr,
  });
  const answer = await prompt([
    {
      type: 'confirm',
      name: 'confirmed',
      default: false,
      message: `Remove ${entry.name} and leave contexts ${contexts} without account access?`,
    },
  ]);

  if (!answer.confirmed) {
    throw new Error('Authentication profile removal cancelled.');
  }
}

export const handler = async (argv) => {
  try {
    const entry = await CliState.getAuthenticationProfile(argv.profile);

    if (!entry) {
      throw new Error(`Authentication profile does not exist: ${argv.profile}`);
    }

    await confirmDependantRemoval(entry, argv);
    await CliState.removeAuthenticationProfile(argv.profile);

    printStructuredOutput({
      value: { removed: argv.profile, affectedContexts: entry.referencedBy },
      argv,
      printHuman: () => {
        Log(`Removed authentication profile ${argv.profile}.`);
      },
    });
    process.exit(0);
  } catch (err) {
    logManagementError(err, argv);
    process.exit(1);
  }
};
