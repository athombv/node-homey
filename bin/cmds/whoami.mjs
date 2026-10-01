import colors from 'colors';
import { logJsonError, printStructuredOutput } from '../../lib/CliOutput.mjs';
import { applyJqOutputOption, applyJsonOutputOption } from '../../lib/api/ApiCommandOptions.mjs';
import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';

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
    .option('refresh', {
      type: 'boolean',
      default: false,
      desc: 'Refresh cached account data unless the Cloud API is rate limited',
    })
    .example('$0 whoami --json', 'Output the current user as JSON')
    .example("$0 whoami --jq '.email'", 'Print the current user email using jq')
    .help();
};

export const handler = async (argv = {}) => {
  try {
    const profile = await AthomApi.getProfile({ cache: !argv.refresh });
    const output = toProfileOutput(profile);

    printStructuredOutput({
      value: output,
      argv,
      printHuman: () => {
        return printProfile(output);
      },
    });

    process.exit(0);
  } catch (err) {
    logJsonError(err, argv);
    process.exit(1);
  }
};
