import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import AppFactory from '../../lib/AppFactory.js';
import Log from '../../lib/Log.js';
import { driverCreateCommandHelpers, handler } from '../../bin/cmds/app/driver/create.mjs';

function setTerminalInteractivity({ stdinIsTTY, stdoutIsTTY }) {
  const stdinDescriptor = Object.getOwnPropertyDescriptor(process.stdin, 'isTTY');
  const stdoutDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');

  Object.defineProperty(process.stdin, 'isTTY', {
    configurable: true,
    value: stdinIsTTY,
  });
  Object.defineProperty(process.stdout, 'isTTY', {
    configurable: true,
    value: stdoutIsTTY,
  });

  return () => {
    if (stdinDescriptor) {
      Object.defineProperty(process.stdin, 'isTTY', stdinDescriptor);
    } else {
      delete process.stdin.isTTY;
    }

    if (stdoutDescriptor) {
      Object.defineProperty(process.stdout, 'isTTY', stdoutDescriptor);
    } else {
      delete process.stdout.isTTY;
    }
  };
}

afterEach(() => {
  mock.restoreAll();
});

describe('CLI app driver create', () => {
  it('uses the interactive wizard in a TTY and executes the collected driver config', async () => {
    const restoreTerminal = setTerminalInteractivity({
      stdinIsTTY: true,
      stdoutIsTTY: true,
    });
    let exitCode;
    let createConfig;

    try {
      const app = {
        async createDriver() {
          throw new Error('Legacy prompt flow should not run');
        },
        async createDriverFromConfig(config) {
          createConfig = config;
        },
      };

      mock.method(AppFactory, 'getAppInstance', () => app);
      mock.method(driverCreateCommandHelpers, 'runInteractiveCreateWizard', async () => ({
        answers: {
          driverCapabilities: ['onoff'],
          driverClass: 'light',
          driverId: 'my-driver',
          driverName: 'My Driver',
          shouldMigrateCompose: true,
          wirelessType: 'other',
        },
        status: 'submitted',
      }));
      mock.method(process, 'exit', (code) => {
        exitCode = code;
      });

      await handler({ path: '/tmp/app-root' });

      assert.strictEqual(exitCode, 0);
      assert.deepStrictEqual(createConfig, {
        createDiscovery: false,
        driverCapabilities: ['onoff'],
        driverClass: 'light',
        driverId: 'my-driver',
        driverName: 'My Driver',
        shouldInstallOAuth2App: false,
        shouldInstallRFDriver: false,
        shouldInstallZigbeeDriver: false,
        shouldInstallZwaveDriver: false,
        shouldMigrateCompose: true,
        wirelessType: 'other',
      });
    } finally {
      restoreTerminal();
    }
  });

  it('falls back to the legacy prompt flow without an interactive TTY', async () => {
    const restoreTerminal = setTerminalInteractivity({
      stdinIsTTY: false,
      stdoutIsTTY: false,
    });
    let exitCode;
    let createDriverCalls = 0;

    try {
      mock.method(AppFactory, 'getAppInstance', () => ({
        async createDriver() {
          createDriverCalls += 1;
        },
      }));
      mock.method(process, 'exit', (code) => {
        exitCode = code;
      });

      await handler({ path: '/tmp/app-root' });

      assert.strictEqual(createDriverCalls, 1);
      assert.strictEqual(exitCode, 0);
    } finally {
      restoreTerminal();
    }
  });

  it('logs cancellation and exits with code 1 when the interactive wizard is cancelled', async () => {
    const restoreTerminal = setTerminalInteractivity({
      stdinIsTTY: true,
      stdoutIsTTY: true,
    });
    let exitCode;
    let warningMessage;

    try {
      mock.method(AppFactory, 'getAppInstance', () => ({}));
      mock.method(driverCreateCommandHelpers, 'runInteractiveCreateWizard', async () => ({
        status: 'cancelled',
      }));
      mock.method(Log, 'warning', (message) => {
        warningMessage = message;
      });
      mock.method(process, 'exit', (code) => {
        exitCode = code;
      });

      await handler({ path: '/tmp/app-root' });

      assert.strictEqual(exitCode, 1);
      assert.strictEqual(warningMessage, 'Driver creation cancelled.');
    } finally {
      restoreTerminal();
    }
  });

  it('maps nested discovery and protocol fields into the driver create config', () => {
    assert.deepStrictEqual(
      driverCreateCommandHelpers.buildDriverCreateConfig({
        createDiscovery: true,
        deviceProductName: 'Bridge Plug',
        deviceVendorId: '123',
        discoveryIdentifier: 'txt.id',
        discoveryMdnsName: '_mydevice',
        discoveryMdnsProtocol: 'tcp',
        discoverySearch: 'urn:schemas-upnp-org:device:Basic:1',
        discoveryStrategyTitle: 'my-discovery',
        discoveryStrategyType: 'mdns-sd',
        driverCapabilities: ['onoff'],
        driverClass: 'light',
        driverId: 'my-driver',
        driverName: 'My Driver',
        isBridgedDevice: true,
        matterProductId: '2222',
        matterVendorId: '1111',
        shouldInstallOAuth2App: true,
        shouldInstallRFDriver: true,
        shouldInstallZigbeeDriver: true,
        shouldInstallZwaveDriver: true,
        shouldMigrateCompose: true,
        wirelessType: 'matter',
        zwaveAllianceProductDocumentation: 'https://example.com/doc',
        zwaveAllianceProductId: '4567',
        zwaveExclusionDescription: 'Hold button B',
        zwaveInclusionDescription: 'Hold button A',
        zwaveManufacturerId: '1',
        zwaveProductId: '3,4',
        zwaveProductTypeId: '2',
      }),
      {
        createDiscovery: true,
        deviceProductName: 'Bridge Plug',
        deviceVendorId: '123',
        discoveryStrategy: {
          identifier: 'txt.id',
          macAddresses: undefined,
          name: '_mydevice',
          protocol: 'tcp',
          search: 'urn:schemas-upnp-org:device:Basic:1',
          title: 'my-discovery',
          type: 'mdns-sd',
        },
        driverCapabilities: ['onoff'],
        driverClass: 'light',
        driverId: 'my-driver',
        driverName: 'My Driver',
        isBridgedDevice: true,
        productId: '2222',
        shouldInstallOAuth2App: true,
        shouldInstallRFDriver: true,
        shouldInstallZigbeeDriver: true,
        shouldInstallZwaveDriver: true,
        shouldMigrateCompose: true,
        vendorId: '1111',
        wirelessType: 'matter',
      },
    );
  });
});
