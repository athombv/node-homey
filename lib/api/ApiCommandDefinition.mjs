'use strict';

import { HomeyAPIV3Local } from 'homey-api';

// Intentionally scoped to the managers supported by CLI commands.
const HOMEY_MANAGER_WHITELIST = new Set(['devices', 'flow', 'system']);

let cachedHomeyV3LocalSpecification = null;

export function camelToKebab(input) {
  return String(input)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase();
}

function getHomeyV3LocalSpecification() {
  if (cachedHomeyV3LocalSpecification) return cachedHomeyV3LocalSpecification;

  const api = new HomeyAPIV3Local({
    properties: {
      id: 'homey-cli-spec',
      softwareVersion: '0.0.0',
    },
    strategy: [],
    baseUrl: 'http://127.0.0.1',
    token: null,
  });

  cachedHomeyV3LocalSpecification = api.getSpecification();

  return cachedHomeyV3LocalSpecification;
}

export function getHomeyApiSpecification() {
  return getHomeyV3LocalSpecification();
}

export function getHomeyManagerDefinition(managerIdCamelCase) {
  if (!HOMEY_MANAGER_WHITELIST.has(managerIdCamelCase)) {
    return null;
  }

  const specification = getHomeyV3LocalSpecification();
  const managerEntry = Object.entries(specification.managers || {}).find(
    ([, manager]) => manager.idCamelCase === managerIdCamelCase,
  );

  if (!managerEntry) {
    return null;
  }

  const [managerName, manager] = managerEntry;

  const operations = Object.entries(manager.operations || {})
    .filter(([, operation]) => operation.private !== true)
    .map(([operationId, operation]) => {
      return {
        id: operationId,
        cliName: camelToKebab(operationId),
        method: String(operation.method || 'get').toUpperCase(),
        path: operation.path || '/',
        parameters: operation.parameters || {},
      };
    });

  const defaultOperation = operations[0] || null;

  return {
    managerName,
    managerId: manager.id,
    managerIdCamelCase: manager.idCamelCase,
    operations,
    defaultOperationId: defaultOperation ? defaultOperation.id : null,
  };
}

export default {
  camelToKebab,
  getHomeyApiSpecification,
  getHomeyManagerDefinition,
};
