import Table from 'cli-table';
import colors from 'colors';

import Log from '../../../lib/Log.js';
import { applyJsonOutputOption } from '../../../lib/api/ApiCommandOptions.mjs';
import { camelToKebab, getHomeyApiSpecification } from '../../../lib/api/ApiCommandDefinition.mjs';
import { applyJqFilter } from '../../../lib/api/ApiCommandJq.mjs';

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

function sortByManagerId(left, right) {
  return String(left.manager.idCamelCase).localeCompare(String(right.manager.idCamelCase));
}

function matchesManagerFilter(filterValue, managerName, manager) {
  if (!filterValue) {
    return true;
  }

  return (
    String(filterValue) === String(manager.idCamelCase) ||
    String(filterValue) === String(manager.id) ||
    String(filterValue) === String(managerName)
  );
}

function matchesOperationFilter(filterValue, operationId) {
  if (!filterValue) {
    return true;
  }

  return (
    String(filterValue) === String(operationId) || String(filterValue) === camelToKebab(operationId)
  );
}

function getFilteredSchema({ specification, managerFilter, operationFilter }) {
  let hasManagerMatch = false;
  let hasOperationMatch = false;

  const managers = Object.entries(specification.managers || {})
    .filter(([managerName, manager]) => {
      const isManagerMatch = matchesManagerFilter(managerFilter, managerName, manager);

      if (isManagerMatch) {
        hasManagerMatch = true;
      }

      return isManagerMatch;
    })
    .map(([managerName, manager]) => {
      const operations = Object.entries(manager.operations || {})
        .filter(([, operation]) => operation.private !== true)
        .filter(([operationId]) => {
          const isOperationMatch = matchesOperationFilter(operationFilter, operationId);

          if (isOperationMatch) {
            hasOperationMatch = true;
          }

          return isOperationMatch;
        });

      return {
        managerName,
        manager: {
          ...manager,
          operations: Object.fromEntries(operations),
        },
      };
    })
    .filter(({ manager }) => Object.keys(manager.operations || {}).length > 0)
    .sort(sortByManagerId);

  if (managerFilter && !hasManagerMatch) {
    throw new Error(`No manager matched filter "${managerFilter}".`);
  }

  if (operationFilter && !hasOperationMatch) {
    throw new Error(`No operation matched filter "${operationFilter}".`);
  }

  return {
    managers: Object.fromEntries(
      managers.map(({ managerName, manager }) => [managerName, manager]),
    ),
  };
}

function getRequiredParameters(operation) {
  return Object.entries(operation.parameters || {})
    .filter(([, parameter]) => parameter.required === true)
    .map(
      ([parameterName, parameter]) =>
        `${camelToKebab(parameterName)} (${parameter.in ?? 'unknown'})`,
    );
}

function printHumanSchema(filteredSchema) {
  const managerEntries = Object.entries(filteredSchema.managers || {});

  if (managerEntries.length === 0) {
    Log('No schema entries matched the provided filters.');
    return;
  }

  managerEntries.forEach(([managerName, manager], managerIndex) => {
    if (managerIndex > 0) {
      Log('');
    }

    const title = `${manager.idCamelCase} (${manager.id})`;
    Log(colors.white.bold(title));
    Log(colors.grey(`Source key: ${managerName}`));

    const table = new Table({
      head: ['Operation', 'Method', 'Path', 'Required Params'].map((column) =>
        colors.white.bold(column),
      ),
      wordWrap: true,
    });

    Object.entries(manager.operations || {}).forEach(([operationId, operation]) => {
      const requiredParameters = getRequiredParameters(operation);

      table.push([
        camelToKebab(operationId),
        String(operation.method || 'get').toUpperCase(),
        operation.path || '/',
        requiredParameters.length > 0 ? requiredParameters.join(', ') : '-',
      ]);
    });

    Log(table.toString());
  });
}

function printSchema({ filteredSchema, argv }) {
  if (argv.jq) {
    Log(applyJqFilter(filteredSchema, argv.jq));
    return;
  }

  if (argv.json) {
    Log(JSON.stringify(filteredSchema, null, 2));
    return;
  }

  printHumanSchema(filteredSchema);
}

export const desc = 'Inspect available Homey API managers and operations';
export const builder = (yargs) => {
  return applyJsonOutputOption(yargs)
    .option('manager', {
      type: 'string',
      description: 'Filter by manager idCamelCase, manager id, or specification key',
    })
    .option('operation', {
      type: 'string',
      description: 'Filter by operation id or kebab-case CLI name',
    })
    .option('jq', {
      type: 'string',
      description: 'Filter schema JSON output using a jq expression',
    })
    .example(
      '$0 api schema',
      'Print a human-readable overview of the available Homey API operations',
    )
    .example("$0 api schema --json --jq '.managers | keys'", 'List manager keys using jq')
    .help();
};

export const handler = async (argv) => {
  try {
    const specification = getHomeyApiSpecification();
    const filteredSchema = getFilteredSchema({
      specification,
      managerFilter: argv.manager,
      operationFilter: argv.operation,
    });

    printSchema({
      filteredSchema,
      argv,
    });

    process.exit(0);
  } catch (err) {
    logCommandError(err, argv);
    process.exit(1);
  }
};
