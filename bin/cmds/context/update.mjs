import {
  applyContextOutputOptions,
  logManagementError,
  printContext,
} from '../../../lib/ContextCommandSupport.mjs';
import { refreshContextTargetMetadata } from '../../../lib/ContextOperations.mjs';
import { CliState } from '../../../services/CliState.mjs';

async function readStandardInput() {
  let value = '';

  for await (const chunk of process.stdin) {
    value += chunk;
  }

  return value.trim();
}

function applyRoutePatch(context, argv) {
  if (argv.strategy) {
    context.route = {
      type: 'discovery',
      strategies: argv.strategy,
    };
  } else if (argv.usb) {
    context.route = { type: 'usb' };
  } else if (argv.address) {
    context.route = {
      type: 'address',
      address: argv.address,
    };
  } else if (argv.useDefaultRoute || argv.unsetAddress) {
    context.route = undefined;
  }
}

function applyContextPatch(context, argv) {
  if (typeof argv.description === 'string') {
    context.description = argv.description;
  }

  if (argv.unsetDescription) {
    delete context.description;
  }

  if (typeof argv.homeyId === 'string') {
    context.target.homeyId = argv.homeyId;
  }

  if (typeof argv.homeyName === 'string') {
    context.target.name = argv.homeyName;
  }

  if (typeof argv.platform === 'string') {
    context.target.platform = argv.platform;
  }

  if (argv.unsetHomeyId) {
    delete context.target.homeyId;
  }

  if (argv.unsetMetadata) {
    delete context.target.name;
    delete context.target.platform;
  }

  if (typeof argv.authProfile === 'string') {
    context.authenticationProfile = argv.authProfile;
  }

  if (argv.unsetAuthProfile) {
    delete context.authenticationProfile;
  }

  if (typeof argv.tokenEnv === 'string') {
    context.homeyAuthentication = {
      source: 'environment',
      variable: argv.tokenEnv,
    };
  }

  if (argv.unsetHomeyAuth) {
    delete context.homeyAuthentication;
  }

  applyRoutePatch(context, argv);

  return context;
}

export const command = 'update <name>';
export const desc = 'Patch a Homey context';

export const builder = (yargs) => {
  return applyContextOutputOptions(yargs)
    .positional('name', { type: 'string', description: 'Context name' })
    .option('description', { type: 'string' })
    .option('unset-description', { type: 'boolean', default: false })
    .option('homey-id', { type: 'string' })
    .option('homey-name', { type: 'string' })
    .option('platform', { type: 'string' })
    .option('unset-homey-id', { type: 'boolean', default: false })
    .option('unset-metadata', { type: 'boolean', default: false })
    .option('auth-profile', { type: 'string' })
    .option('unset-auth-profile', { type: 'boolean', default: false })
    .option('token-env', { type: 'string' })
    .option('token-stdin', { type: 'boolean', default: false })
    .option('unset-homey-auth', { type: 'boolean' })
    .option('store', { choices: ['settings', 'keychain'] })
    .option('strategy', { type: 'string', array: true })
    .option('usb', { type: 'boolean' })
    .option('address', { type: 'string' })
    .option('unset-address', { type: 'boolean', default: false })
    .option('use-default-route', { type: 'boolean' })
    .option('refresh', {
      type: 'boolean',
      default: false,
      description: 'Refresh cached target metadata from the account',
    })
    .conflicts('strategy', ['usb', 'address', 'use-default-route'])
    .conflicts('usb', ['address', 'use-default-route'])
    .conflicts('address', 'use-default-route')
    .conflicts('token-env', ['token-stdin', 'unset-homey-auth'])
    .conflicts('token-stdin', 'unset-homey-auth')
    .help();
};

export const handler = async (argv) => {
  try {
    let directToken = null;
    let store = null;

    if (argv.tokenStdin) {
      directToken = await readStandardInput();

      if (!directToken) {
        throw new Error('No Homey token was provided on standard input.');
      }

      store = argv.store ?? (await CliState.getDefaultCredentialStore());
    }

    let context = await CliState.updateContext(
      argv.name,
      (existing) => {
        return applyContextPatch(existing, argv);
      },
      directToken ? { directToken, store } : {},
    );

    if (argv.refresh) {
      context = await refreshContextTargetMetadata(argv.name);
    }

    printContext(context, argv);
    process.exit(0);
  } catch (err) {
    logManagementError(err, argv);
    process.exit(1);
  }
};
