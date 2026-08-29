import inquirer from 'inquirer';

import {
  applyContextOutputOptions,
  logManagementError,
  printContext,
} from '../../../lib/ContextCommandSupport.mjs';
import { CliState } from '../../../services/CliState.mjs';
import { diagnoseContext } from './diagnose.mjs';

function buildRoute(argv) {
  if (argv.usb) {
    return { type: 'usb' };
  }

  if (argv.address) {
    return {
      type: 'address',
      address: argv.address,
    };
  }

  if (argv.strategy) {
    return {
      type: 'discovery',
      strategies: argv.strategy,
    };
  }

  return undefined;
}

async function readStandardInput() {
  let value = '';

  for await (const chunk of process.stdin) {
    value += chunk;
  }

  return value.trim();
}

async function promptForValue({ name, message, password = false }) {
  const prompt = inquirer.createPromptModule({
    input: process.stdin,
    output: process.stderr,
  });
  const answers = await prompt([
    {
      type: password ? 'password' : 'text',
      name,
      message,
      ...(password ? { mask: '*' } : {}),
    },
  ]);

  return answers[name] || null;
}

async function resolveStoredToken(argv, { inferPrompt = false } = {}) {
  if (argv.tokenStdin) {
    const token = await readStandardInput();

    if (!token) {
      throw new Error('No Homey token was provided on standard input.');
    }

    return token;
  }

  if (!argv.tokenPrompt && !inferPrompt) {
    return null;
  }

  if (!process.stdin.isTTY) {
    throw new Error('--token-prompt requires an interactive terminal.');
  }

  const token = await promptForValue({
    name: 'token',
    message: 'Homey token:',
    password: true,
  });

  if (!token) {
    throw new Error('A Homey token is required.');
  }

  return token;
}

function getAuthenticationProfile(argv, hasDirectAuthentication) {
  if (argv.authProfile) {
    return argv.authProfile;
  }

  if (hasDirectAuthentication) {
    return null;
  }

  return 'default';
}

export const command = 'create <name>';
export const desc = 'Create a Homey context';

export const builder = (yargs) => {
  return applyContextOutputOptions(yargs)
    .positional('name', { type: 'string', description: 'Context name' })
    .option('description', { type: 'string', description: 'Human-readable description' })
    .option('homey-id', { type: 'string', description: 'Canonical Homey ID' })
    .option('homey-name', { type: 'string', description: 'Cached Homey display name' })
    .option('platform', { type: 'string', description: 'Cached Homey platform' })
    .option('auth-profile', { type: 'string', description: 'Athom authentication profile' })
    .option('token-env', {
      type: 'string',
      description: 'Read the direct Homey token from this environment variable',
    })
    .option('token-stdin', {
      type: 'boolean',
      description: 'Read and store the direct Homey token from standard input',
    })
    .option('token-prompt', {
      type: 'boolean',
      description: 'Prompt securely for and store a direct Homey token',
    })
    .option('store', {
      choices: ['settings', 'keychain'],
      description: 'Storage backend for a prompted or stdin token',
    })
    .option('strategy', {
      type: 'string',
      array: true,
      description: 'Allowed homey-api discovery strategy (repeatable)',
    })
    .option('usb', {
      type: 'boolean',
      description: 'Use only a USB connection',
    })
    .option('address', {
      type: 'string',
      description: 'Use only this Homey API base URL',
    })
    .option('use', {
      type: 'boolean',
      description: 'Make the new context current',
    })
    .option('check', {
      type: 'boolean',
      description: 'Check the connection after creating the context',
    })
    .conflicts('strategy', ['usb', 'address'])
    .conflicts('usb', 'address')
    .conflicts('token-env', ['token-stdin', 'token-prompt'])
    .conflicts('token-stdin', 'token-prompt')
    .help();
};

export const handler = async (argv) => {
  try {
    const shouldInferDirectPrompt = Boolean(
      argv.address &&
      !argv.homeyId &&
      !argv.authProfile &&
      !argv.tokenEnv &&
      !argv.tokenStdin &&
      process.stdin.isTTY,
    );
    const directToken = await resolveStoredToken(argv, {
      inferPrompt: shouldInferDirectPrompt,
    });
    const store = argv.store ?? (await CliState.getDefaultCredentialStore());
    const hasDirectAuthentication = Boolean(argv.tokenEnv || directToken);
    const authenticationProfile = getAuthenticationProfile(argv, hasDirectAuthentication);
    let homeyId = argv.homeyId;
    let address = argv.address;

    if (!homeyId && authenticationProfile && process.stdin.isTTY) {
      homeyId = await promptForValue({
        name: 'homeyId',
        message: 'Homey ID:',
      });
    }

    if (!address && hasDirectAuthentication && !authenticationProfile && process.stdin.isTTY) {
      address = await promptForValue({
        name: 'address',
        message: 'Homey API address:',
      });
    }

    const homeyAuthentication = argv.tokenEnv
      ? {
          source: 'environment',
          variable: argv.tokenEnv,
        }
      : null;
    const context = await CliState.createContext(
      argv.name,
      {
        description: argv.description,
        target: {
          homeyId,
          name: argv.homeyName,
          platform: argv.platform,
        },
        authenticationProfile,
        homeyAuthentication,
        route: buildRoute({
          ...argv,
          address,
        }),
      },
      {
        directToken,
        store,
        use: argv.use,
      },
    );

    if (argv.check) {
      await diagnoseContext(argv.name, argv);
    }

    printContext(context, argv);
    process.exit(0);
  } catch (err) {
    logManagementError(err, argv);
    process.exit(1);
  }
};
