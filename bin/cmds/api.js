/* eslint-disable no-console */

'use strict';

const HomeyAPIV3Local = require('homey-api/assets/specifications/HomeyAPIV3Local.json');
const { AthomApi } = require('../../index'); // TODO: Replace with homey-api

exports.desc = 'Web API related commands';
exports.builder = yargs => {
  for (const [managerName, manager] of Object.entries(HomeyAPIV3Local.managers)) {
    yargs.command({
      command: manager.id,
      desc: managerName,
      builder: yargs => {
        for (const [operationId, operation] of Object.entries(manager.operations)) {
          yargs.command({
            command: operationId,
            desc: `Scopes:
${operation.scopes.join(', ')}

HTTP:
${operation.method.toUpperCase()} ${operation.path}

Documentation:
https://athombv.github.io/node-homey-api/HomeyAPIV3Local.${managerName}.html#${operationId}`,
            builder(yargs) {
              // Homey
              yargs.option('homey', {
                type: 'string',
                desc: 'Homey ID. Defaults to the selected Homey.',
              });

              // CI
              yargs.option('ci', {
                description: 'Only print JSON',
                default: false,
                type: 'boolean',
              });

              // Parameters
              if (operation.parameters) {
                Object.entries(operation.parameters).forEach(([parameterId, parameter]) => {
                  yargs.option(`arg-${parameterId}`, {
                    required: parameter.required,
                  });
                });
              }
            },
            async handler(yargs) {
              const homeyApi = yargs.homey
                ? await AthomApi.getHomey(yargs.homey)
                : await AthomApi.getActiveHomey();

              // Parameters
              const parameters = {};
              if (operation.parameters) {
                Object.entries(operation.parameters).forEach(([parameterId, parameter]) => {
                  const value = yargs[`arg-${parameterId}`];
                  if (value === undefined) return;

                  // Boolean
                  if (parameter.type === 'boolean') {
                    parameters[parameterId] = Boolean(value);
                  }

                  if (parameter.type === undefined && value === 'true') {
                    parameters[parameterId] = true;
                  }

                  if (parameter.type === undefined && value === 'false') {
                    parameters[parameterId] = false;
                  }

                  // Number
                  if (parameter.type === 'number') {
                    parameters[parameterId] = Number(value);
                  }

                  // String
                  if (parameter.type === 'string') {
                    parameters[parameterId] = String(value);
                  }

                  // Object
                  if (parameter.type === 'object') {
                    parameters[parameterId] = JSON.parse(value);
                  }

                  // Array
                  if (parameter.type === 'array') {
                    parameters[parameterId] = JSON.parse(value);
                  }
                });
              }

              if (!yargs.ci) console.log('Request:');
              if (!yargs.ci) console.log(parameters);

              const method = homeyApi[manager.id][operationId];
              const result = await method.call(homeyApi[manager.id], parameters);

              if (!yargs.ci) console.log('\nResponse:');
              console.log(result);
            },
          });
        }

        yargs.demandCommand();
      },
    });
  }

  yargs.demandCommand();
};
