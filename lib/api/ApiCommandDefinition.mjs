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

function createHomeyManagerDefinition([managerName, manager]) {
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

export function getHomeyManagerDefinitions() {
  const specification = getHomeyV3LocalSpecification();

  return Object.entries(specification.managers || {})
    .filter(([, manager]) => HOMEY_MANAGER_WHITELIST.has(manager.idCamelCase))
    .sort(([, leftManager], [, rightManager]) => {
      return String(leftManager.idCamelCase).localeCompare(String(rightManager.idCamelCase));
    })
    .map((managerEntry) => createHomeyManagerDefinition(managerEntry));
}

export function getHomeyManagerDefinition(managerIdCamelCase) {
  if (!HOMEY_MANAGER_WHITELIST.has(managerIdCamelCase)) {
    return null;
  }

  return (
    getHomeyManagerDefinitions().find(
      (managerDefinition) => managerDefinition.managerIdCamelCase === managerIdCamelCase,
    ) || null
  );
}

export default {
  camelToKebab,
  getHomeyApiSpecification,
  getHomeyManagerDefinitions,
  getHomeyManagerDefinition,
};
