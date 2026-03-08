import assert from 'node:assert';
import { describe, it } from 'node:test';

import {
  formatAvailabilityLabel,
  getHomeyApiSpecification,
  getHomeyManagerDefinition,
  HOMEY_API_AVAILABILITY,
  isAvailabilitySupportedByPlatform,
  mergeHomeyApiSpecifications,
} from '../../lib/api/ApiCommandDefinition.mjs';

describe('ApiCommandDefinition', () => {
  it('merges Local and Cloud specifications with Local precedence', () => {
    const mergedSpecification = mergeHomeyApiSpecifications(
      {
        managers: {
          ManagerSystemLocal: {
            id: 'system',
            idCamelCase: 'system',
            operations: {
              ping: {
                method: 'get',
                path: '/local/ping',
                parameters: {
                  localFlag: {
                    type: 'boolean',
                    in: 'query',
                  },
                },
              },
              reboot: {
                method: 'post',
                path: '/local/reboot',
              },
            },
          },
        },
      },
      {
        managers: {
          ManagerSystemCloud: {
            id: 'system',
            idCamelCase: 'system',
            operations: {
              ping: {
                method: 'post',
                path: '/cloud/ping',
                parameters: {
                  cloudFlag: {
                    type: 'string',
                    in: 'query',
                  },
                },
              },
              delete: {
                method: 'post',
                path: '/delete',
              },
            },
          },
        },
      },
    );

    const [managerName, manager] = Object.entries(mergedSpecification.managers)[0];

    assert.strictEqual(managerName, 'ManagerSystemLocal');
    assert.strictEqual(manager.availability, HOMEY_API_AVAILABILITY.BOTH);
    assert.strictEqual(manager.operations.ping.method, 'get');
    assert.strictEqual(manager.operations.ping.path, '/local/ping');
    assert.deepStrictEqual(manager.operations.ping.parameters, {
      localFlag: {
        type: 'boolean',
        in: 'query',
      },
    });
    assert.strictEqual(manager.operations.ping.availability, HOMEY_API_AVAILABILITY.BOTH);
    assert.strictEqual(manager.operations.reboot.availability, HOMEY_API_AVAILABILITY.LOCAL);
    assert.strictEqual(manager.operations.delete.availability, HOMEY_API_AVAILABILITY.CLOUD);
  });

  it('marks known whitelisted operations with platform availability', () => {
    const apiManager = getHomeyManagerDefinition('api');
    const systemManager = getHomeyManagerDefinition('system');
    const devicesManager = getHomeyManagerDefinition('devices');
    const googleAssistantManager = getHomeyManagerDefinition('googleAssistant');

    assert.ok(apiManager);
    assert.ok(systemManager);
    assert.ok(devicesManager);
    assert.ok(googleAssistantManager);
    assert.strictEqual(apiManager.managerCliName, 'api');
    assert.strictEqual(googleAssistantManager.managerCliName, 'google-assistant');

    assert.strictEqual(
      systemManager.operations.find((operation) => operation.id === 'delete').availability,
      HOMEY_API_AVAILABILITY.CLOUD,
    );
    assert.strictEqual(
      systemManager.operations.find((operation) => operation.id === 'rebootOTA').availability,
      HOMEY_API_AVAILABILITY.LOCAL,
    );
    assert.strictEqual(
      devicesManager.operations.find((operation) => operation.id === 'getDevices').availability,
      HOMEY_API_AVAILABILITY.BOTH,
    );

    const specification = getHomeyApiSpecification();
    assert.strictEqual(
      specification.managers.ManagerSystem.operations.delete.availability,
      HOMEY_API_AVAILABILITY.CLOUD,
    );
  });

  it('formats and evaluates availability labels', () => {
    assert.strictEqual(formatAvailabilityLabel(HOMEY_API_AVAILABILITY.LOCAL), 'local');
    assert.strictEqual(formatAvailabilityLabel(HOMEY_API_AVAILABILITY.CLOUD), 'cloud');
    assert.strictEqual(formatAvailabilityLabel(HOMEY_API_AVAILABILITY.BOTH), 'both');

    assert.strictEqual(
      isAvailabilitySupportedByPlatform(HOMEY_API_AVAILABILITY.BOTH, 'local'),
      true,
    );
    assert.strictEqual(
      isAvailabilitySupportedByPlatform(HOMEY_API_AVAILABILITY.LOCAL, 'local'),
      true,
    );
    assert.strictEqual(
      isAvailabilitySupportedByPlatform(HOMEY_API_AVAILABILITY.CLOUD, 'local'),
      false,
    );
  });
});
