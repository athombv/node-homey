import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import { APIErrorHomeyOffline, HomeyAPI } from 'homey-api';

import AthomApi from '../../lib/AthomApi.js';
import Settings from '../../services/Settings.js';

afterEach(() => {
  mock.restoreAll();
});

describe('AthomApi selected Homey persistence', () => {
  it('persists platform alongside id and name', async () => {
    const athomApi = new AthomApi();
    const settingsSet = mock.method(Settings, 'set', async (key, value) => ({ key, value }));

    await athomApi.setActiveHomey({
      id: 'homey-id',
      name: 'Homey Name',
      platform: 'cloud',
    });

    assert.strictEqual(settingsSet.mock.callCount(), 1);
    assert.deepStrictEqual(settingsSet.mock.calls[0].arguments, [
      'activeHomey',
      {
        id: 'homey-id',
        name: 'Homey Name',
        platform: 'cloud',
      },
    ]);
  });

  it('passes through the selected Homey platform when selecting by name', async () => {
    const athomApi = new AthomApi();

    mock.method(athomApi, 'getHomeys', async () => [
      {
        id: 'homey-id',
        name: 'Homey Name',
        platform: 'local',
      },
    ]);

    const setActiveHomey = mock.method(
      athomApi,
      'setActiveHomey',
      async (activeHomey) => activeHomey,
    );

    const result = await athomApi.selectActiveHomey({
      name: 'Homey Name',
    });

    assert.deepStrictEqual(result, {
      id: 'homey-id',
      name: 'Homey Name',
      platform: 'local',
    });
    assert.deepStrictEqual(setActiveHomey.mock.calls[0].arguments[0], {
      id: 'homey-id',
      name: 'Homey Name',
      platform: 'local',
    });
  });

  it('passes through the selected Homey platform when selecting by id', async () => {
    const athomApi = new AthomApi();

    mock.method(athomApi, 'getHomeys', async () => [
      {
        id: 'homey-id',
        name: 'Homey Name',
        platform: 'local',
      },
    ]);

    const setActiveHomey = mock.method(
      athomApi,
      'setActiveHomey',
      async (activeHomey) => activeHomey,
    );

    const result = await athomApi.selectActiveHomey({
      id: 'homey-id',
    });

    assert.deepStrictEqual(result, {
      id: 'homey-id',
      name: 'Homey Name',
      platform: 'local',
    });
    assert.deepStrictEqual(setActiveHomey.mock.calls[0].arguments[0], {
      id: 'homey-id',
      name: 'Homey Name',
      platform: 'local',
    });
  });

  it('authenticates the active Homey with local-first discovery strategies', async () => {
    const athomApi = new AthomApi();
    const authenticatedApi = {};
    const authenticateCalls = [];

    mock.method(Settings, 'get', async (key) => {
      assert.strictEqual(key, 'activeHomey');
      return {
        id: 'homey-id',
        name: 'Homey Name',
        platform: 'local',
      };
    });
    mock.method(athomApi, 'getHomey', async (homeyId) => {
      assert.strictEqual(homeyId, 'homey-id');

      return {
        id: 'homey-id',
        name: 'Homey Name',
        model: 'Homey Pro',
        usb: '10.0.0.1',
        authenticate: async (options) => {
          authenticateCalls.push(options);
          return authenticatedApi;
        },
      };
    });

    const result = await athomApi.getActiveHomey();

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

  it('maps active Homey offline errors to the CLI-friendly message', async () => {
    const athomApi = new AthomApi();

    mock.method(Settings, 'get', async () => ({
      id: 'homey-id',
      name: 'Homey Name',
      platform: 'local',
    }));
    mock.method(athomApi, 'getHomey', async () => ({
      id: 'homey-id',
      name: 'Homey Name',
      authenticate: async () => {
        throw new APIErrorHomeyOffline();
      },
    }));

    await assert.rejects(
      () => athomApi.getActiveHomey(),
      /Homey Name \(homey-id\) seems to be offline/,
    );
  });
});
