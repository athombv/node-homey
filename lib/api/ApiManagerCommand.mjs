import Log from '../Log.js';
import { applyHomeyApiExecutionOptions, applyHomeyIdOption } from './ApiCommandOptions.mjs';
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
  const commandNames = managerDefinition.operations.map((operation) => operation.cliName);

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
    command: managerDefinition.managerIdCamelCase,
    desc: getManagerCommandDescription(managerDefinition, extension),
    builder: (yargs) => {
      showManagerHelp = () => {
        yargs.showHelp('log');
      };

      const registeredCommandNames = new Set();

      managerDefinition.operations.forEach((operation) => {
        registeredCommandNames.add(operation.cliName);

        yargs.command(
          operation.cliName,
          `${operation.method} ${operation.path}`,
          (operationYargs) => {
            return applyOperationOptions(
              applyJqOption(applyHomeyApiExecutionOptions(operationYargs)),
              operation,
            ).help();
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
  createHomeyManagerCommand,
  getManagerCommandNames,
};
