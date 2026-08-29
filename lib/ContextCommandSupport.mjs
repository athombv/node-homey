import Table from 'cli-table';
import colors from 'colors';

import { printStructuredOutput } from './CliOutput.mjs';
import { applyJsonOutputOption } from './api/ApiCommandOptions.mjs';
import Log from './Log.js';

export function logManagementError(err, argv = {}) {
  const message = err?.message ?? String(err);

  if (argv.json) {
    console.error(
      JSON.stringify(
        {
          error: message,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.error(`Error: ${message}`);
}

export function applyContextOutputOptions(yargs) {
  return applyJsonOutputOption(yargs);
}

export function toContextOutput(entry) {
  const { context } = entry;

  return {
    name: entry.name,
    current: entry.current,
    description: context.description ?? null,
    target: {
      homeyId: context.target.homeyId ?? null,
      name: context.target.name ?? null,
      platform: context.target.platform ?? null,
    },
    authenticationProfile: context.authenticationProfile ?? null,
    homeyAuthentication: context.homeyAuthentication
      ? {
          ...context.homeyAuthentication,
          credentialId: context.homeyAuthentication.credentialId ? '[REDACTED]' : undefined,
        }
      : null,
    capabilities: {
      account: Boolean(context.authenticationProfile),
      homey: Boolean(context.homeyAuthentication),
    },
    route: context.route,
    health: entry.health,
  };
}

export function printContexts(entries, argv) {
  const output = entries.map((entry) => {
    return toContextOutput(entry);
  });

  printStructuredOutput({
    value: output,
    argv,
    printHuman: () => {
      const table = new Table({
        head: ['Current', 'Name', 'Target', 'Auth profile', 'Capabilities', 'Route', 'Health'].map(
          (title) => {
            return colors.white.bold(title);
          },
        ),
      });

      for (const entry of output) {
        const target = entry.target.name ?? entry.target.homeyId ?? '-';
        const capabilities = Object.entries(entry.capabilities)
          .filter(([, configured]) => {
            return configured;
          })
          .map(([capability]) => {
            return capability;
          })
          .join(', ');
        let route = entry.route.type;

        if (entry.route.type === 'discovery') {
          route = entry.route.strategies.join(',');
        } else if (entry.route.type === 'address') {
          route = entry.route.address;
        }

        table.push([
          entry.current ? '*' : '',
          entry.name,
          target,
          entry.authenticationProfile ?? '-',
          capabilities || '-',
          route,
          entry.health.status,
        ]);
      }

      Log(table.toString());
    },
  });
}

export function printContext(entry, argv) {
  const output = toContextOutput(entry);

  printStructuredOutput({
    value: output,
    argv,
    printHuman: () => {
      Log(JSON.stringify(output, null, 2));
    },
  });
}

export function toAuthenticationProfileOutput(entry) {
  const source = entry.profile.credentialSource;
  const credentialSource = source
    ? {
        ...source,
        credentialId: source.credentialId ? '[REDACTED]' : undefined,
      }
    : null;

  return {
    name: entry.name,
    accountId: entry.profile.accountId ?? null,
    email: entry.profile.email ?? null,
    displayName: entry.profile.displayName ?? null,
    credentialSource,
    usable: entry.usable,
    reason: entry.reason,
    referencedBy: entry.referencedBy,
  };
}

export function printAuthenticationProfiles(entries, argv) {
  const output = entries.map((entry) => {
    return toAuthenticationProfileOutput(entry);
  });

  printStructuredOutput({
    value: output,
    argv,
    printHuman: () => {
      const table = new Table({
        head: ['Name', 'Account', 'Email', 'Source', 'Usable', 'Contexts'].map((title) => {
          return colors.white.bold(title);
        }),
      });

      for (const profile of output) {
        table.push([
          profile.name,
          profile.accountId ?? '-',
          profile.email ?? '-',
          profile.credentialSource?.type ?? '-',
          profile.usable ? 'yes' : 'no',
          profile.referencedBy.join(', ') || '-',
        ]);
      }

      Log(table.toString());
    },
  });
}

export function printAuthenticationProfile(entry, argv) {
  const output = toAuthenticationProfileOutput(entry);

  printStructuredOutput({
    value: output,
    argv,
    printHuman: () => {
      Log(JSON.stringify(output, null, 2));
    },
  });
}
