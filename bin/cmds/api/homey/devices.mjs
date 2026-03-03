'use strict';

import Log from '../../../../lib/Log.js';
import { getHomeyManagerDefinition } from '../../../../lib/api/ApiCommandDefinition.mjs';
import { applyOperationOptions, buildOperationArgs } from '../../../../lib/api/ApiCommandParser.mjs';
import { createHomeyApiClient, getRequestTimeout } from '../../../../lib/api/ApiCommandRuntime.mjs';
import { printResult } from '../../../../lib/api/ApiCommandOutput.mjs';

const managerDefinition = getHomeyManagerDefinition('devices');

if (!managerDefinition) {
  throw new Error('Missing manager definition for devices');
}

function getManager(api) {
  const manager = api[managerDefinition.managerIdCamelCase];

  if (!manager) {
    throw new Error(`Manager not available: ${managerDefinition.managerIdCamelCase}`);
  }

  return manager;
}

async function executeOperation(argv, operation) {
  const timeout = getRequestTimeout(argv.timeout);
  const api = await createHomeyApiClient({
    token: argv.token,
    address: argv.address,
  });

  const manager = getManager(api);

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
}

export const desc = 'Devices manager operations';

export const builder = (yargs) => {
  managerDefinition.operations.forEach((operation) => {
    yargs.command(
      operation.cliName,
      `${operation.method} ${operation.path}`,
      (operationYargs) => {
        return applyOperationOptions(operationYargs, operation)
          .help();
      },
      async (argv) => {
        try {
          await executeOperation(argv, operation);
          process.exit(0);
        } catch (err) {
          Log.error(err);
          process.exit(1);
        }
      },
    );
  });

  return yargs.help();
};

export const handler = async (argv) => {
  try {
    const preferredDefaultOperationId = 'getDevices';
    const defaultOperation = managerDefinition.operations
      .find((operation) => operation.id === preferredDefaultOperationId)
      || managerDefinition.operations
        .find((operation) => operation.id === managerDefinition.defaultOperationId);

    if (!defaultOperation) {
      throw new Error('No default operation configured for devices manager.');
    }

    await executeOperation(argv, defaultOperation);
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
