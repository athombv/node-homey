import inquirer from 'inquirer';

import { printStructuredOutput } from '../../../lib/CliOutput.mjs';
import {
  applyContextOutputOptions,
  logManagementError,
} from '../../../lib/ContextCommandSupport.mjs';
import Log from '../../../lib/Log.js';
import CliState from '../../../services/CliState.js';

export const command = 'rm <name>';
export const aliases = ['remove'];
export const desc = 'Remove a Homey context without cascading';

export const builder = (yargs) => {
  return applyContextOutputOptions(yargs)
    .positional('name', { type: 'string', description: 'Context name' })
    .option('yes', {
      alias: 'y',
      type: 'boolean',
      default: false,
      description: 'Confirm removal non-interactively',
    });
};

async function confirmCurrentContextRemoval(name, argv) {
  const entry = await CliState.getContext(name);

  if (!entry?.current) {
    return;
  }

  if (argv.yes) {
    return;
  }

  if (!process.stdin.isTTY) {
    throw new Error(
      `Context ${name} is current. Removing it leaves a broken current reference; re-run with --yes.`,
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
      message: `Remove current context ${name} and leave its current reference broken?`,
    },
  ]);

  if (!answer.confirmed) {
    throw new Error('Context removal cancelled.');
  }
}

export const handler = async (argv) => {
  try {
    await confirmCurrentContextRemoval(argv.name, argv);
    await CliState.removeContext(argv.name);

    printStructuredOutput({
      value: { removed: argv.name },
      argv,
      printHuman: () => {
        Log(`Removed context ${argv.name}.`);
      },
    });
    process.exit(0);
  } catch (err) {
    logManagementError(err, argv);
    process.exit(1);
  }
};
