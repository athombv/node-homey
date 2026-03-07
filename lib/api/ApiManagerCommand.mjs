import Log from '../Log.js';
import { applyHomeyApiExecutionOptions, applyHomeyIdOption } from './ApiCommandOptions.mjs';
import {
  formatAvailabilityLabel,
  HOMEY_API_AVAILABILITY,
  isAvailabilitySupportedByPlatform,
} from './ApiCommandDefinition.mjs';
import { buildSchemaCommand, executeSchemaCommand } from './ApiSchemaCommand.mjs';
import { applyJqFilter } from './ApiCommandJq.mjs';
import { applyOperationOptions, buildOperationArgs } from './ApiCommandParser.mjs';
import { createHomeyApiClient, getRequestTimeout } from './ApiCommandRuntime.mjs';
import { printResult } from './ApiCommandOutput.mjs';

function camelToTitle(input) {
  const normalized = String(input)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1 $2')
    .trim();

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getManager(api, managerDefinition) {
  const manager = api[managerDefinition.managerIdCamelCase];

  if (!manager) {
    throw new Error(`Manager not available: ${managerDefinition.managerIdCamelCase}`);
  }

  return manager;
}

function logCommandError(err, argv) {
  if (argv.json) {
    Log(
      JSON.stringify(
        {
          error: err?.message ?? String(err),
        },
        null,
        2,
      ),
    );
    return;
  }

  Log.error(err);
}

function getPrimaryCommandName(commandDefinition) {
  return String(commandDefinition.command || '')
    .trim()
    .split(/\s+/, 1)[0];
}

function applyJqOption(yargs) {
  return yargs.option('jq', {
    type: 'string',
    description: 'Filter JSON output using a jq expression',
  });
}

function createCommandHandler(handler) {
  return async (argv) => {
    try {
      await handler(argv);
      process.exit(0);
    } catch (err) {
      logCommandError(err, argv);
      process.exit(1);
    }
  };
}

function getDefaultManagerDescription(managerDefinition) {
  return `${camelToTitle(managerDefinition.managerIdCamelCase)} manager operations`;
}

function getManagerCommandDescription(managerDefinition, extension) {
  if (extension?.description) {
    return extension.description;
  }

  return getDefaultManagerDescription(managerDefinition);
}

function getOperationAvailabilitySuffix(operation) {
  if (!operation?.availability || operation.availability === HOMEY_API_AVAILABILITY.BOTH) {
    return '';
  }

  return ` [${formatAvailabilityLabel(operation.availability)}]`;
}

function getOperationHelpDescription(operation) {
  return `${operation.method} ${operation.path}${getOperationAvailabilitySuffix(operation)}`;
}

function getOperationAvailabilityEpilog(operation) {
  if (!operation?.availability || operation.availability === HOMEY_API_AVAILABILITY.BOTH) {
    return null;
  }

  return `Platform: ${formatAvailabilityLabel(operation.availability)}.`;
}

export function assertOperationSupportedByHomeyPlatform(operation, platform) {
  if (isAvailabilitySupportedByPlatform(operation?.availability, platform)) {
    return;
  }

  throw new Error(
    `Operation ${operation.cliName} requires platform ${formatAvailabilityLabel(operation.availability)} and cannot be used with a ${platform} Homey.`,
  );
}

function printOperationResult({ managerDefinition, operation, result, argv }) {
  if (argv.jq) {
    Log(applyJqFilter(result, argv.jq));
    return;
  }

  printResult({
    managerId: managerDefinition.managerId,
    operationId: operation.id,
    result,
    json: argv.json,
  });
}

function createExecuteOperation(managerDefinition) {
  return async function executeOperation(argv, operation) {
    const timeout = getRequestTimeout(argv.timeout);
    const api = await createHomeyApiClient({
      token: argv.token,
      address: argv.address,
      homeyId: argv.homeyId,
    });

    assertOperationSupportedByHomeyPlatform(operation, api.platform);

    const manager = getManager(api, managerDefinition);

    if (typeof manager[operation.id] !== 'function') {
      throw new Error(`Operation not available: ${operation.id}`);
    }

    const args = buildOperationArgs(argv, operation);
    const result = await manager[operation.id]({
      ...args,
      $timeout: timeout,
    });

    printOperationResult({
      managerDefinition,
      operation,
      result,
      argv,
    });
  };
}

function resolveOperation(managerDefinition, operationReference) {
  return (
    managerDefinition.operations.find(
      (operation) =>
        operation.id === operationReference || operation.cliName === operationReference,
    ) || null
  );
}

export function getManagerCommandNames(managerDefinition, extension = null) {
  const commandNames = [
    'schema',
    ...managerDefinition.operations.map((operation) => operation.cliName),
  ];

  if (extension?.commands) {
    extension.commands.forEach((commandDefinition) => {
      commandNames.push(getPrimaryCommandName(commandDefinition));
    });
  }

  return commandNames;
}

export function createHomeyManagerCommand({ managerDefinition, extension = null }) {
  if (!managerDefinition) {
    throw new Error('Missing manager definition.');
  }

  const executeOperation = createExecuteOperation(managerDefinition);
  const customCommandHandlers = new Map();
  let showManagerHelp = () => {};

  const managerCommandContext = {
    applyHomeyApiExecutionOptions,
    applyHomeyIdOption,
    managerDefinition,
    createHomeyApiClient,
    executeOperation: async (argv, operationReference) => {
      const operation = resolveOperation(managerDefinition, operationReference);

      if (!operation) {
        throw new Error(
          `Unknown operation for ${managerDefinition.managerIdCamelCase}: ${operationReference}`,
        );
      }

      return executeOperation(argv, operation);
    },
    getRequestTimeout,
  };

  return {
    command: managerDefinition.managerCliName || managerDefinition.managerIdCamelCase,
    desc: getManagerCommandDescription(managerDefinition, extension),
    builder: (yargs) => {
      showManagerHelp = () => {
        yargs.showHelp('log');
      };

      const registeredCommandNames = new Set();

      registeredCommandNames.add('schema');
      yargs.command(
        'schema',
        `Inspect schema for ${camelToTitle(managerDefinition.managerIdCamelCase)}`,
        (schemaYargs) => buildSchemaCommand(schemaYargs, { includeManagerOption: false }).help(),
        createCommandHandler((argv) =>
          executeSchemaCommand(argv, {
            managerFilter: managerDefinition.managerIdCamelCase,
          }),
        ),
      );

      managerDefinition.operations.forEach((operation) => {
        registeredCommandNames.add(operation.cliName);

        yargs.command(
          operation.cliName,
          getOperationHelpDescription(operation),
          (operationYargs) => {
            const configuredYargs = applyOperationOptions(
              applyJqOption(applyHomeyApiExecutionOptions(operationYargs)),
              operation,
            ).help();

            const availabilityEpilog = getOperationAvailabilityEpilog(operation);

            if (availabilityEpilog) {
              configuredYargs.epilog(availabilityEpilog);
            }

            return configuredYargs;
          },
          createCommandHandler((argv) => executeOperation(argv, operation)),
        );
      });

      if (extension?.commands) {
        extension.commands.forEach((commandDefinition) => {
          const primaryCommandName = getPrimaryCommandName(commandDefinition);

          if (registeredCommandNames.has(primaryCommandName)) {
            throw new Error(
              `Custom command collision for ${managerDefinition.managerIdCamelCase}: ${primaryCommandName}`,
            );
          }

          registeredCommandNames.add(primaryCommandName);
          customCommandHandlers.set(primaryCommandName, commandDefinition.handler);

          yargs.command(
            commandDefinition.command,
            commandDefinition.describe,
            (customYargs) => {
              if (typeof commandDefinition.builder === 'function') {
                return commandDefinition.builder(customYargs, managerCommandContext);
              }

              return customYargs;
            },
            createCommandHandler((argv) => commandDefinition.handler(argv, managerCommandContext)),
          );
        });
      }

      return yargs.help();
    },
    handler: createCommandHandler(async () => {
      showManagerHelp();
    }),
  };
}

export default {
  assertOperationSupportedByHomeyPlatform,
  createHomeyManagerCommand,
  getManagerCommandNames,
};
