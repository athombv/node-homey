import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import { homeyDriverCapabilitiesRuntimeHelpers } from '../../lib/ui/homey-driver-capabilities/homey-driver-capabilities-runtime.mjs';

afterEach(() => {
  mock.restoreAll();
});

describe('homey driver capabilities runtime', () => {
  it('orchestrates compose migration, driver selection, back navigation, and capability save', async () => {
    const pickerCalls = [];
    let migrated = false;
    let savedArgs;
    const responses = [
      {
        status: 'submitted',
        value: 'migrate',
      },
      {
        status: 'submitted',
        value: 'beta',
      },
      {
        status: 'back',
      },
      {
        status: 'submitted',
        value: 'alpha',
      },
      {
        status: 'submitted',
        values: ['onoff', 'dim'],
      },
    ];
    const app = {
      getDriverComposeJson: async (driverId) => ({
        capabilities: ['onoff'],
        id: driverId,
      }),
      getDrivers: async () => ['alpha', 'beta'],
      hasHomeyCompose: () => false,
      migrateToCompose: async () => {
        migrated = true;
      },
      setDriverCapabilities: async (driverId, capabilities) => {
        savedArgs = {
          capabilities,
          driverId,
        };

        return {
          capabilities,
          id: driverId,
        };
      },
    };

    mock.method(homeyDriverCapabilitiesRuntimeHelpers, 'getCapabilityChoices', async () => [
      {
        label: 'On/Off [onoff]',
        value: 'onoff',
      },
      {
        label: 'Dim [dim]',
        value: 'dim',
      },
    ]);
    mock.method(
      homeyDriverCapabilitiesRuntimeHelpers,
      'runInteractiveChoicePicker',
      async (options) => {
        pickerCalls.push(options);
        return responses.shift();
      },
    );

    const result = await homeyDriverCapabilitiesRuntimeHelpers.runInteractiveFlow({ app });

    assert.strictEqual(migrated, true);
    assert.deepStrictEqual(savedArgs, {
      capabilities: ['onoff', 'dim'],
      driverId: 'alpha',
    });
    assert.deepStrictEqual(result, {
      driver: {
        capabilities: ['onoff', 'dim'],
        id: 'alpha',
      },
      driverId: 'alpha',
      status: 'updated',
    });
    assert.strictEqual(pickerCalls[0].searchEnabled, false);
    assert.strictEqual(pickerCalls[1].itemLabelPlural, 'Drivers');
    assert.strictEqual(pickerCalls[2].mode, 'multi');
    assert.strictEqual(pickerCalls[2].allowBack, true);
    assert.strictEqual(pickerCalls[4].subtitle, 'Editing driver: alpha');
  });

  it('returns cancelled when the compose prompt is cancelled', async () => {
    const app = {
      hasHomeyCompose: () => false,
    };

    mock.method(homeyDriverCapabilitiesRuntimeHelpers, 'runInteractiveChoicePicker', async () => ({
      status: 'cancelled',
    }));

    const result = await homeyDriverCapabilitiesRuntimeHelpers.runInteractiveFlow({ app });

    assert.deepStrictEqual(result, {
      status: 'cancelled',
    });
  });
});
