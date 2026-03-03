'use strict';

import Log from '../Log.js';
import { getHomeyManagerDefinition } from './ApiCommandDefinition.mjs';
import { applyOperationOptions, buildOperationArgs } from './ApiCommandParser.mjs';
import { createHomeyApiClient, getRequestTimeout } from './ApiCommandRuntime.mjs';
import { printResult } from './ApiCommandOutput.mjs';

function getManager(api, managerDefinition) {
  const manager = api[managerDefinition.managerIdCamelCase];

  if (!manager) {
    throw new Error(`Manager not available: ${managerDefinition.managerIdCamelCase}`);
  }

  return manager;
}

function logCommandError(err, argv) {
  if (argv.json) {
    Log(JSON.stringify({
      error: err?.message ?? String(err),
    }, null, 2));
    return;
  }

  Log.error(err);
}

function resolveDefaultOperation(managerDefinition, preferredDefaultOperationIds = []) {
  for (const operationId of preferredDefaultOperationIds) {
    const operation = managerDefinition.operations
      .find((candidate) => candidate.id === operationId);

    if (operation) {
      return operation;
    }
  }

  return managerDefinition.operations
    .find((operation) => operation.id === managerDefinition.defaultOperationId) || null;
}

function createExecuteOperation(managerDefinition) {
  return async function executeOperation(argv, operation) {
    const timeout = getRequestTimeout(argv.timeout);
    const api = await createHomeyApiClient({
      token: argv.token,
      address: argv.address,
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

    printResult({
      managerId: managerDefinition.managerId,
      operationId: operation.id,
      result,
      json: argv.json,
    });
  };
}

export function createHomeyManagerCommand({
  managerIdCamelCase,
  description,
  preferredDefaultOperationIds = [],
}) {
  const managerDefinition = getHomeyManagerDefinition(managerIdCamelCase);

  if (!managerDefinition) {
    throw new Error(`Missing manager definition for ${managerIdCamelCase}`);
  }

  const executeOperation = createExecuteOperation(managerDefinition);

  return {
    desc: description,
    builder: (yargs) => {
      managerDefinition.operations.forEach((operation) => {
        yargs.command(
          operation.cliName,
          `${operation.method} ${operation.path}`,
          (operationYargs) => applyOperationOptions(operationYargs, operation)
            .help(),
          async (argv) => {
            try {
              await executeOperation(argv, operation);
              process.exit(0);
            } catch (err) {
              logCommandError(err, argv);
              process.exit(1);
            }
          },
        );
      });

      return yargs.help();
    },
    handler: async (argv) => {
      try {
        const defaultOperation = resolveDefaultOperation(
          managerDefinition,
          preferredDefaultOperationIds,
        );

        if (!defaultOperation) {
          throw new Error(`No default operation configured for ${managerIdCamelCase} manager.`);
        }

        await executeOperation(argv, defaultOperation);
        process.exit(0);
      } catch (err) {
        logCommandError(err, argv);
        process.exit(1);
      }
    },
  };
}

export default {
  createHomeyManagerCommand,
};
