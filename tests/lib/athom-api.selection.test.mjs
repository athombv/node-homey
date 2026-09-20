import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import { APIErrorHomeyOffline, HomeyAPI } from 'homey-api';

import AthomApi from '../../lib/AthomApi.js';
import Settings from '../../services/Settings.js';

afterEach(() => {
  mock.restoreAll();
});

describe('AthomApi selected Homey persistence', () => {
  it('uses explicit discovery strategies without overriding the route with USB', async () => {
    const athomApi = new AthomApi();
    athomApi.discoveryStrategies = ['cloud', 'mdns'];
    const authenticate = mock.fn(async () => ({}));
    mock.method(Settings, 'get', async () => ({ id: 'homey-id' }));
    mock.method(athomApi, 'getHomey', async () => ({
      id: 'homey-id',
      usb: '10.0.0.1',
      authenticate,
    }));

    const result = await athomApi.getActiveHomey();

    assert.deepStrictEqual(authenticate.mock.calls[0].arguments, [{ strategy: ['cloud', 'mdns'] }]);
    assert.strictEqual(result.__baseUrlPromise, undefined);
  });

  it('persists platform alongside id and name', async () => {
    const athomApi = new AthomApi();
    const settingsSet = mock.method(Settings, 'set', async (key, value) => {
      return { key, value };
    });

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

    mock.method(athomApi, 'getHomeys', async () => {
      return [
        {
          id: 'homey-id',
          name: 'Homey Name',
          platform: 'local',
        },
      ];
    });

    const setActiveHomey = mock.method(athomApi, 'setActiveHomey', async (activeHomey) => {
      return activeHomey;
    });

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

    mock.method(Settings, 'get', async () => {
      return {
        id: 'homey-id',
        name: 'Homey Name',
        platform: 'local',
      };
    });
    mock.method(athomApi, 'getHomey', async () => {
      return {
        id: 'homey-id',
        name: 'Homey Name',
        authenticate: async () => {
          throw new APIErrorHomeyOffline();
        },
      };
    });

    await assert.rejects(() => {
      return athomApi.getActiveHomey();
    }, /Homey Name \(homey-id\) seems to be offline/);
  });

  it('authenticates a Cloud Homey with only the Cloud discovery strategy', async () => {
    const athomApi = new AthomApi();
    const authenticatedApi = {};
    const authenticateCalls = [];

    mock.method(Settings, 'get', async () => {
      return { id: 'cloud-homey' };
    });
    mock.method(athomApi, 'getHomey', async () => {
      return {
        id: 'cloud-homey',
        name: 'Cloud Homey',
        platform: HomeyAPI.PLATFORMS.CLOUD,
        model: 'Homey Cloud',
        authenticate: async (options) => {
          authenticateCalls.push(options);
          return authenticatedApi;
        },
      };
    });

    const result = await athomApi.getActiveHomey();

    assert.strictEqual(result, authenticatedApi);
    assert.deepStrictEqual(authenticateCalls, [
      { strategy: [HomeyAPI.DISCOVERY_STRATEGIES.CLOUD] },
    ]);
  });

  it('selects a Homey when no selection has been persisted', async () => {
    const athomApi = new AthomApi();
    const selected = { id: 'selected-homey', name: 'Selected Homey', platform: 'local' };
    const selectActiveHomey = mock.method(athomApi, 'selectActiveHomey', async () => {
      return selected;
    });

    mock.method(Settings, 'get', async () => {
      return null;
    });
    mock.method(athomApi, 'getHomey', async () => {
      return {
        ...selected,
        authenticate: async () => {
          return {};
        },
      };
    });

    await athomApi.getActiveHomey();

    assert.strictEqual(selectActiveHomey.mock.callCount(), 1);
  });

  it('caches the authenticated active Homey', async () => {
    const athomApi = new AthomApi();
    const authenticatedApi = {};
    let authenticateCalls = 0;

    mock.method(Settings, 'get', async () => {
      return { id: 'homey-id' };
    });
    mock.method(athomApi, 'getHomey', async () => {
      return {
        id: 'homey-id',
        name: 'Homey Name',
        platform: 'local',
        authenticate: async () => {
          authenticateCalls += 1;
          return authenticatedApi;
        },
      };
    });

    assert.strictEqual(await athomApi.getActiveHomey(), authenticatedApi);
    assert.strictEqual(await athomApi.getActiveHomey(), authenticatedApi);
    assert.strictEqual(authenticateCalls, 1);
  });

  it('passes through authentication errors that do not mean offline', async () => {
    const athomApi = new AthomApi();
    const error = new Error('authentication rejected');

    mock.method(Settings, 'get', async () => {
      return { id: 'homey-id' };
    });
    mock.method(athomApi, 'getHomey', async () => {
      return {
        id: 'homey-id',
        name: 'Homey Name',
        platform: 'local',
        authenticate: async () => {
          throw error;
        },
      };
    });

    await assert.rejects(
      () => {
        return athomApi.getActiveHomey();
      },
      (actualError) => {
        return actualError === error;
      },
    );
  });

  it('migrates legacy authentication and invokes login when no session exists', async () => {
    const athomApi = new AthomApi();
    const settingsSetCalls = [];
    const settingsUnsetCalls = [];
    const fakeApi = {
      async isLoggedIn() {
        return false;
      },
    };
    const login = mock.method(athomApi, 'login', async () => {});

    mock.method(athomApi, '_createApi', () => {
      athomApi._api = fakeApi;
    });
    mock.method(Settings, 'get', async (key) => {
      assert.strictEqual(key, '_athom_api_state');
      return {
        athomCloudToken: {
          access_token: 'legacy-access',
          refresh_token: 'legacy-refresh',
        },
      };
    });
    mock.method(Settings, 'set', async (...args) => {
      settingsSetCalls.push(args);
    });
    mock.method(Settings, 'unset', async (...args) => {
      settingsUnsetCalls.push(args);
    });

    assert.strictEqual(await athomApi._initApi(), fakeApi);
    assert.strictEqual(login.mock.callCount(), 1);
    assert.deepStrictEqual(settingsUnsetCalls, [['_athom_api_state']]);
    assert.strictEqual(settingsSetCalls[0][0], 'homeyApi');
    assert.strictEqual(settingsSetCalls[0][1].token.access_token, 'legacy-access');
  });

  it('forwards delegation token options to the authenticated account API', async () => {
    const athomApi = new AthomApi();
    const calls = [];

    mock.method(athomApi, '_initApi', async () => {
      athomApi._api = {
        async createDelegationToken(options) {
          calls.push(options);
          return 'delegation-token';
        },
      };
    });

    const token = await athomApi.createDelegationToken({ audience: 'apps' });

    assert.strictEqual(token, 'delegation-token');
    assert.deepStrictEqual(calls, [{ audience: 'apps' }]);
  });
});
