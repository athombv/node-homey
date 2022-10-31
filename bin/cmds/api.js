'use strict';

const HomeyAPIV3Local = require('homey-api/assets/specifications/HomeyAPIV3Local.json');
const { AthomApi } = require('../../index'); // TODO: Replace with homey-api

exports.desc = 'Web API related commands';
exports.builder = yargs => {
  yargs.option('homey', {
    type: 'string',
    desc: 'Homey ID. Defaults to the selected Homey.',
  });

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
              let result = yargs;
              // Parameters
              if (operation.parameters) {
                Object.entries(operation.parameters).forEach(([parameterId, parameter]) => {
                  result = result.option(parameterId, {
                    required: parameter.required,
                  });
                });
              }
              return result;
            },
            async handler(yargs) {
              const homeyApi = yargs.homey
                ? await AthomApi.getHomey(yargs.homey)
                : await AthomApi.getActiveHomey();

              // Parameters
              const parameters = {};
              if (operation.parameters) {
                Object.entries(operation.parameters).forEach(([parameterId, parameter]) => {
                  // Boolean
                  if (parameter.type === 'boolean') {
                    parameters[parameterId] = Boolean(yargs[parameterId]);
                  }

                  if (parameter.type === undefined && yargs[parameterId] === 'true') {
                    parameters[parameterId] = true;
                  }

                  if (parameter.type === undefined && yargs[parameterId] === 'false') {
                    parameters[parameterId] = false;
                  }

                  // Number
                  if (parameter.type === 'number') {
                    parameters[parameterId] = Number(yargs[parameterId]);
                  }

                  // String
                  if (parameter.type === 'string') {
                    parameters[parameterId] = String(yargs[parameterId]);
                  }

                  // Object
                  if (parameter.type === 'object') {
                    parameters[parameterId] = JSON.parse(yargs[parameterId]);
                  }

                  // Array
                  if (parameter.type === 'array') {
                    parameters[parameterId] = JSON.parse(yargs[parameterId]);
                  }
                });
              }

              const method = homeyApi[manager.id][operationId];
              const result = await method.call(homeyApi[manager.id], parameters);

              // eslint-disable-next-line no-console
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
