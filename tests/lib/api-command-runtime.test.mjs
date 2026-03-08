import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import { APIErrorHomeyOffline, HomeyAPI, HomeyAPIV3Local } from 'homey-api';

import AthomApi from '../../services/AthomApi.js';
import { createHomeyApiClient, diagnoseHomeyStrategies } from '../../lib/api/ApiCommandRuntime.mjs';

afterEach(() => {
  mock.restoreAll();
});

describe('ApiCommandRuntime createHomeyApiClient', () => {
  it('authenticates the requested Homey id instead of the selected Homey', async () => {
    const authenticatedApi = {};
    const authenticateCalls = [];

    mock.method(AthomApi, 'getSelectedHomey', async () => {
      throw new Error('Selected Homey should not be used when --homey-id is provided.');
    });
    mock.method(AthomApi, 'getHomey', async (homeyId) => {
      assert.strictEqual(homeyId, 'target-homey');

      return {
        id: 'target-homey',
        name: 'Office Homey',
        model: 'Homey Pro',
        usb: '10.0.0.1',
        authenticate: async (options) => {
          authenticateCalls.push(options);
          return authenticatedApi;
        },
      };
    });

    const result = await createHomeyApiClient({ homeyId: 'target-homey' });

    assert.strictEqual(result, authenticatedApi);
    assert.deepStrictEqual(authenticateCalls, [
      {
        strategy: [
          HomeyAPI.DISCOVERY_STRATEGIES.LOCAL_SECURE,
          HomeyAPI.DISCOVERY_STRATEGIES.LOCAL,
          HomeyAPI.DISCOVERY_STRATEGIES.REMOTE_FORWARDED,
          HomeyAPI.DISCOVERY_STRATEGIES.CLOUD,
        ],
      },
    ]);
    assert.strictEqual(await result.__baseUrlPromise, 'http://10.0.0.1:80');
    assert.strictEqual(result.model, 'Homey Pro');
  });

  it('maps offline authenticate failures to the CLI-friendly error', async () => {
    mock.method(AthomApi, 'getHomey', async () => ({
      id: 'target-homey',
      name: 'Office Homey',
      authenticate: async () => {
        throw new APIErrorHomeyOffline();
      },
    }));

    await assert.rejects(
      () => createHomeyApiClient({ homeyId: 'target-homey' }),
      /Office Homey \(target-homey\) seems to be offline/,
    );
  });

  it('prefers the usb address for token mode when resolving by Homey id', async () => {
    mock.method(AthomApi, 'getHomey', async (homeyId) => {
      assert.strictEqual(homeyId, 'target-homey');

      return {
        id: 'target-homey',
        name: 'Office Homey',
        model: 'Homey Pro',
        usb: '10.0.0.1',
        localUrlSecure: 'https://192.168.1.20',
        localUrl: 'http://192.168.1.20',
      };
    });

    const result = await createHomeyApiClient({
      token: 'abc',
      homeyId: 'target-homey',
    });

    assert.ok(result instanceof HomeyAPIV3Local);
    assert.strictEqual(await result.baseUrl, 'http://10.0.0.1:80');
    assert.strictEqual(result.model, 'Homey Pro');
  });

  it('uses the secure local url for token mode when usb is unavailable', async () => {
    mock.method(AthomApi, 'getHomey', async () => ({
      id: 'target-homey',
      name: 'Office Homey',
      localUrlSecure: 'https://192.168.1.20',
      localUrl: 'http://192.168.1.20',
    }));

    const result = await createHomeyApiClient({
      token: 'abc',
      homeyId: 'target-homey',
    });

    assert.ok(result instanceof HomeyAPIV3Local);
    assert.strictEqual(await result.baseUrl, 'https://192.168.1.20');
  });

  it('rejects token mode when neither address nor homey id is provided', async () => {
    await assert.rejects(
      () => createHomeyApiClient({ token: 'abc' }),
      /Missing required option: --address or --homey-id/,
    );
  });

  it('rejects token mode when both address and homey id are provided', async () => {
    await assert.rejects(
      () =>
        createHomeyApiClient({
          token: 'abc',
          address: 'http://127.0.0.1',
          homeyId: 'target-homey',
        }),
      /--address and --homey-id cannot be used together with --token/,
    );
  });

  it('fails token mode by Homey id when the cached Homey has no local address', async () => {
    mock.method(AthomApi, 'getHomey', async () => ({
      id: 'target-homey',
      name: 'Office Homey',
    }));

    await assert.rejects(
      () =>
        createHomeyApiClient({
          token: 'abc',
          homeyId: 'target-homey',
        }),
      /does not expose a usable local address for token mode/,
    );
  });
});

describe('ApiCommandRuntime diagnoseHomeyStrategies', () => {
  it('tests each local strategy and reports successful routes', async () => {
    const authenticateCalls = [];
    const cleanupCalls = [];

    mock.method(AthomApi, 'getHomey', async () => ({
      id: 'target-homey',
      name: 'Office Homey',
      model: 'Homey Pro',
      platform: HomeyAPI.PLATFORMS.LOCAL,
      remoteUrlForwarded: 'https://remote.example',
      authenticate: async ({ strategy }) => {
        authenticateCalls.push(strategy);

        switch (strategy[0]) {
          case HomeyAPI.DISCOVERY_STRATEGIES.LOCAL_SECURE:
            throw new APIErrorHomeyOffline();
          case HomeyAPI.DISCOVERY_STRATEGIES.LOCAL:
            return {
              strategyId: HomeyAPI.DISCOVERY_STRATEGIES.LOCAL,
              baseUrl: 'http://192.168.1.20',
              destroy: () => cleanupCalls.push('local:destroy'),
            };
          case HomeyAPI.DISCOVERY_STRATEGIES.REMOTE_FORWARDED:
            return {
              strategyId: HomeyAPI.DISCOVERY_STRATEGIES.REMOTE_FORWARDED,
              baseUrl: 'https://remote.example',
              disconnect: async () => cleanupCalls.push('remote:disconnect'),
              destroy: () => cleanupCalls.push('remote:destroy'),
            };
          case HomeyAPI.DISCOVERY_STRATEGIES.CLOUD:
            return {
              strategyId: HomeyAPI.DISCOVERY_STRATEGIES.CLOUD,
              baseUrl: 'https://cloud.example',
              disconnect: async () => cleanupCalls.push('cloud:disconnect'),
              destroy: () => cleanupCalls.push('cloud:destroy'),
            };
          case HomeyAPI.DISCOVERY_STRATEGIES.MDNS:
            throw new Error('mDNS unavailable');
          default:
            throw new Error(`Unexpected strategy: ${strategy[0]}`);
        }
      },
    }));

    const report = await diagnoseHomeyStrategies({ homeyId: 'target-homey' });

    assert.deepStrictEqual(authenticateCalls, [
      [HomeyAPI.DISCOVERY_STRATEGIES.LOCAL_SECURE],
      [HomeyAPI.DISCOVERY_STRATEGIES.LOCAL],
      [HomeyAPI.DISCOVERY_STRATEGIES.REMOTE_FORWARDED],
      [HomeyAPI.DISCOVERY_STRATEGIES.CLOUD],
      [HomeyAPI.DISCOVERY_STRATEGIES.MDNS],
    ]);
    assert.deepStrictEqual(report.preferredStrategyIds, [
      HomeyAPI.DISCOVERY_STRATEGIES.LOCAL_SECURE,
      HomeyAPI.DISCOVERY_STRATEGIES.LOCAL,
      HomeyAPI.DISCOVERY_STRATEGIES.REMOTE_FORWARDED,
      HomeyAPI.DISCOVERY_STRATEGIES.CLOUD,
    ]);
    assert.deepStrictEqual(report.attemptedStrategyIds, [
      HomeyAPI.DISCOVERY_STRATEGIES.LOCAL_SECURE,
      HomeyAPI.DISCOVERY_STRATEGIES.LOCAL,
      HomeyAPI.DISCOVERY_STRATEGIES.REMOTE_FORWARDED,
      HomeyAPI.DISCOVERY_STRATEGIES.CLOUD,
      HomeyAPI.DISCOVERY_STRATEGIES.MDNS,
    ]);
    assert.deepStrictEqual(report.availableStrategyIds, [
      HomeyAPI.DISCOVERY_STRATEGIES.LOCAL,
      HomeyAPI.DISCOVERY_STRATEGIES.REMOTE_FORWARDED,
      HomeyAPI.DISCOVERY_STRATEGIES.CLOUD,
    ]);
    assert.strictEqual(report.selectedStrategyId, HomeyAPI.DISCOVERY_STRATEGIES.LOCAL);
    assert.strictEqual(report.selectedBaseUrl, 'http://192.168.1.20');
    assert.match(report.results[0].error, /seems to be offline/);
    assert.match(
      report.results.find((result) => result.strategyId === HomeyAPI.DISCOVERY_STRATEGIES.MDNS)
        ?.error,
      /mDNS unavailable/,
    );
    assert.deepStrictEqual(cleanupCalls, [
      'local:destroy',
      'remote:disconnect',
      'remote:destroy',
      'cloud:disconnect',
      'cloud:destroy',
    ]);
  });

  it('only tests cloud connectivity for cloud homeys', async () => {
    const authenticateCalls = [];

    mock.method(AthomApi, 'getHomey', async () => ({
      id: 'cloud-homey',
      name: 'Cloud Homey',
      platform: HomeyAPI.PLATFORMS.CLOUD,
      authenticate: async ({ strategy }) => {
        authenticateCalls.push(strategy);

        return {
          strategyId: HomeyAPI.DISCOVERY_STRATEGIES.CLOUD,
          baseUrl: 'https://cloud.example',
        };
      },
    }));

    const report = await diagnoseHomeyStrategies({ homeyId: 'cloud-homey' });

    assert.deepStrictEqual(authenticateCalls, [[HomeyAPI.DISCOVERY_STRATEGIES.CLOUD]]);
    assert.deepStrictEqual(report.attemptedStrategyIds, [HomeyAPI.DISCOVERY_STRATEGIES.CLOUD]);
    assert.deepStrictEqual(report.availableStrategyIds, [HomeyAPI.DISCOVERY_STRATEGIES.CLOUD]);
    assert.strictEqual(report.selectedStrategyId, HomeyAPI.DISCOVERY_STRATEGIES.CLOUD);
    assert.strictEqual(report.selectedBaseUrl, 'https://cloud.example');
  });

  it('marks remote forwarded as not configured when the Homey has no forwarded url', async () => {
    const authenticateCalls = [];

    mock.method(AthomApi, 'getHomey', async () => ({
      id: 'target-homey',
      name: 'Office Homey',
      model: 'Homey Pro',
      platform: HomeyAPI.PLATFORMS.LOCAL,
      localUrlSecure: 'https://192-168-1-20.homey.homeylocal.com',
      localUrl: 'http://192.168.1.20',
      remoteUrlForwarded: null,
      remoteUrl: 'https://cloud.example',
      authenticate: async ({ strategy }) => {
        authenticateCalls.push(strategy);

        switch (strategy[0]) {
          case HomeyAPI.DISCOVERY_STRATEGIES.LOCAL_SECURE:
            return {
              strategyId: HomeyAPI.DISCOVERY_STRATEGIES.LOCAL_SECURE,
              baseUrl: 'https://192-168-1-20.homey.homeylocal.com',
            };
          case HomeyAPI.DISCOVERY_STRATEGIES.LOCAL:
            return {
              strategyId: HomeyAPI.DISCOVERY_STRATEGIES.LOCAL,
              baseUrl: 'http://192.168.1.20',
            };
          case HomeyAPI.DISCOVERY_STRATEGIES.CLOUD:
            return {
              strategyId: HomeyAPI.DISCOVERY_STRATEGIES.CLOUD,
              baseUrl: 'https://cloud.example',
            };
          case HomeyAPI.DISCOVERY_STRATEGIES.MDNS:
            throw new Error('mDNS unavailable');
          default:
            throw new Error(`Unexpected strategy: ${strategy[0]}`);
        }
      },
    }));

    const report = await diagnoseHomeyStrategies({ homeyId: 'target-homey' });
    const remoteForwardedResult = report.results.find(
      (result) => result.strategyId === HomeyAPI.DISCOVERY_STRATEGIES.REMOTE_FORWARDED,
    );

    assert.deepStrictEqual(authenticateCalls, [
      [HomeyAPI.DISCOVERY_STRATEGIES.LOCAL_SECURE],
      [HomeyAPI.DISCOVERY_STRATEGIES.LOCAL],
      [HomeyAPI.DISCOVERY_STRATEGIES.CLOUD],
      [HomeyAPI.DISCOVERY_STRATEGIES.MDNS],
    ]);
    assert.ok(remoteForwardedResult);
    assert.strictEqual(remoteForwardedResult.available, false);
    assert.strictEqual(remoteForwardedResult.status, 'not-configured');
    assert.strictEqual(remoteForwardedResult.error, 'Not configured for this Homey');
    assert.strictEqual(remoteForwardedResult.durationMs, 0);
  });
});
