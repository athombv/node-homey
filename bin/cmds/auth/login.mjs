import { printStructuredOutput } from '../../../lib/CliOutput.mjs';
import {
  applyContextOutputOptions,
  logManagementError,
} from '../../../lib/ContextCommandSupport.mjs';
import Log from '../../../lib/Log.js';
import AuthenticationProfiles from '../../../services/AuthenticationProfiles.js';
import CliState from '../../../services/CliState.js';

function toProfileOutput(profile, profileName) {
  return {
    profile: profileName,
    accountId: profile.id ?? null,
    email: profile.email ?? null,
    firstname: profile.firstname ?? null,
    lastname: profile.lastname ?? null,
  };
}

export const command = 'login <profile>';
export const desc = 'Log in an Athom authentication profile';

export const builder = (yargs) => {
  return applyContextOutputOptions(yargs)
    .positional('profile', { type: 'string', description: 'Authentication profile name' })
    .option('pat-env', {
      type: 'string',
      description: 'Read a Personal Access Token from this environment variable',
    })
    .option('store', {
      choices: ['settings', 'keychain'],
      description: 'Storage backend for persistent OAuth credentials',
    })
    .option('replace-account', {
      type: 'boolean',
      default: false,
      description: 'Allow the profile to change canonical account identity',
    });
};

export const handler = async (argv) => {
  try {
    const existing = await CliState.getAuthenticationProfile(argv.profile);
    const existingStore =
      existing?.profile.credentialSource?.type === 'oauth'
        ? existing.profile.credentialSource.store
        : null;
    const store = argv.store ?? existingStore ?? (await CliState.getDefaultCredentialStore());
    const profile = argv.patEnv
      ? await AuthenticationProfiles.loginWithPat(argv.profile, argv.patEnv, {
          replaceAccount: argv.replaceAccount,
        })
      : await AuthenticationProfiles.loginWithOAuth(argv.profile, {
          store,
          replaceAccount: argv.replaceAccount,
        });
    const output = toProfileOutput(profile, argv.profile);

    printStructuredOutput({
      value: output,
      argv,
      printHuman: () => {
        Log(
          `Authentication profile ${argv.profile} is logged in${output.email ? ` as ${output.email}` : ''}.`,
        );
      },
    });
    process.exit(0);
  } catch (err) {
    logManagementError(err, argv);
    process.exit(1);
  }
};
