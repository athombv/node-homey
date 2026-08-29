import Table from 'cli-table';
import colors from 'colors';
import { printStructuredOutput, logJsonError } from '../../lib/CliOutput.mjs';
import { applyJqOutputOption, applyJsonOutputOption } from '../../lib/api/ApiCommandOptions.mjs';
import Log from '../../lib/Log.js';
import { AuthenticationProfiles } from '../../services/AuthenticationProfiles.mjs';

export const desc = 'List all Homeys';

function sortHomeys(homeys) {
  return [...homeys].sort((a, b) => {
    return -(a.state || '').localeCompare(b.state || '');
  });
}

function toHomeyOutput(homey, profile = null) {
  return {
    id: homey.id ?? null,
    name: homey.name ?? null,
    platform: homey.platform ?? null,
    platformVersion: homey.platformVersion ?? null,
    softwareVersion: homey.softwareVersion ?? null,
    apiVersion: homey.apiVersion ?? null,
    language: homey.language ?? null,
    usersCount: Array.isArray(homey.users) ? homey.users.length : 0,
    role: homey.role ?? null,
    region: homey.region ?? null,
    usbAddress: homey.usb ?? null,
    state: homey.state ?? null,
    ...(profile ? { authenticationProfile: profile } : {}),
  };
}

function printHomeysTable(homeys) {
  const table = new Table({
    head: [
      'ID',
      'Name',
      'Platform',
      'Platform Version',
      'Software Version',
      'API Version',
      'Language',
      'Users',
      'Role',
      'Region',
      'USB',
    ].map((title) => colors.white.bold(title)),
  });

  homeys.forEach((homey) => {
    table.push(
      [
        homey.id,
        homey.name,
        homey.platform,
        homey.platformVersion,
        homey.softwareVersion,
        homey.apiVersion,
        homey.language,
        homey.usersCount || '-',
        homey.role,
        homey.region || '-',
        homey.usbAddress ? 'Yes' : '-',
      ].map((value) => value || '-'),
    );
  });

  Log(table.toString());
}

export const builder = (yargs) => {
  return applyJqOutputOption(applyJsonOutputOption(yargs))
    .option('auth-profile', {
      type: 'string',
      description: 'Use a specific Athom authentication profile',
    })
    .option('all-profiles', {
      type: 'boolean',
      default: false,
      description: 'List Homeys from every usable authentication profile',
    })
    .example('$0 list --json', 'Output Homeys as JSON')
    .example("$0 list --jq '.[].name'", 'Print all Homey names using jq')
    .help();
};

export const handler = async (argv = {}) => {
  try {
    if (argv.auth === 'homey') {
      throw new Error(
        'The list command is account-scoped and cannot use direct Homey authentication.',
      );
    }

    let homeys;

    if (argv.allProfiles) {
      const profiles = await AuthenticationProfiles.listUsableClients();
      const homeyGroups = await Promise.all(
        profiles.map(async ({ name, client }) => {
          const profileHomeys = await client.getHomeys();

          return profileHomeys.map((homey) => {
            return toHomeyOutput(homey, name);
          });
        }),
      );

      homeys = sortHomeys(homeyGroups.flat());
    } else {
      const profileName = await AuthenticationProfiles.resolveProfileName({
        explicitProfile: argv.authProfile,
        contextName: argv.context,
      });
      const accountClient = await AuthenticationProfiles.getClient(profileName, {
        allowInteractiveLogin: process.stdin.isTTY,
      });

      homeys = sortHomeys(await accountClient.getHomeys()).map((homey) => {
        return toHomeyOutput(homey);
      });
    }

    printStructuredOutput({
      value: homeys,
      argv,
      printHuman: () => printHomeysTable(homeys),
    });

    process.exit(0);
  } catch (err) {
    logJsonError(err, argv);
    process.exit(1);
  }
};
