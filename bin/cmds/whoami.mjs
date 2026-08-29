import colors from 'colors';
import { logJsonError, printStructuredOutput } from '../../lib/CliOutput.mjs';
import { applyJqOutputOption, applyJsonOutputOption } from '../../lib/api/ApiCommandOptions.mjs';
import Log from '../../lib/Log.js';
import { AuthenticationProfiles } from '../../services/AuthenticationProfiles.mjs';

export const desc = 'Show the current logged in user';

function toProfileOutput(profile) {
  return {
    id: profile.id ?? null,
    firstname: profile.firstname ?? null,
    lastname: profile.lastname ?? null,
    email: profile.email ?? null,
    isVerifiedDeveloper: profile.hasRole('app_developer_trusted'),
  };
}

function printProfile(profile) {
  Log(`${profile.firstname} ${profile.lastname} <${profile.email}>`);

  if (profile.isVerifiedDeveloper) {
    Log(`${colors.cyan('(✔)')} ${colors.white('Verified Developer')}`);
  }
}

export const builder = (yargs) => {
  return applyJqOutputOption(applyJsonOutputOption(yargs))
    .option('auth-profile', {
      type: 'string',
      description: 'Use a specific Athom authentication profile',
    })
    .example('$0 whoami --json', 'Output the current user as JSON')
    .example("$0 whoami --jq '.email'", 'Print the current user email using jq')
    .help();
};

export const handler = async (argv = {}) => {
  try {
    if (argv.auth === 'homey') {
      throw new Error(
        'The whoami command is account-scoped and cannot use direct Homey authentication.',
      );
    }

    const profileName = await AuthenticationProfiles.resolveProfileName({
      explicitProfile: argv.authProfile,
      contextName: argv.context,
    });
    const accountClient = await AuthenticationProfiles.getClient(profileName, {
      allowInteractiveLogin: process.stdin.isTTY,
    });
    const profile = toProfileOutput(await accountClient.getProfile());

    printStructuredOutput({
      value: profile,
      argv,
      printHuman: () => printProfile(profile),
    });

    process.exit(0);
  } catch (err) {
    logJsonError(err, argv);
    process.exit(1);
  }
};
