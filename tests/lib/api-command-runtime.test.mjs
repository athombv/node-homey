import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import { APIErrorHomeyOffline, HomeyAPI, HomeyAPIV3Local } from 'homey-api';

import AthomApi from '../../services/AthomApi.js';
import { createHomeyApiClient } from '../../lib/api/ApiCommandRuntime.mjs';

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
