import assert from 'node:assert';
import os from 'node:os';
import { afterEach, describe, it, mock } from 'node:test';

import AthomApi from '../../lib/AthomApi.js';

afterEach(() => {
  mock.restoreAll();
});

describe('AthomApi local discovery fetch behavior', () => {
  it('skips local discovery when local probing is disabled', async () => {
    const athomApi = new AthomApi();
    const homeys = [{ id: 'homey-1', name: 'Homey One' }];

    athomApi._user = {
      getHomeys: async () => homeys,
    };

    mock.method(athomApi, '_initApi', async () => {});
    const networkInterfaces = mock.method(os, 'networkInterfaces', () => {
      throw new Error('networkInterfaces should not be called');
    });
    const fetchSpy = mock.method(global, 'fetch', async () => {
      throw new Error('fetch should not be called');
    });

    const result = await athomApi.getHomeys({ cache: false, local: false });

    assert.deepStrictEqual(result, homeys);
    assert.strictEqual(networkInterfaces.mock.callCount(), 0);
    assert.strictEqual(fetchSpy.mock.callCount(), 0);
  });

  it('can enrich a cached Homey list with local discovery later', async () => {
    const athomApi = new AthomApi();
    const homeys = [{ id: 'homey-1', name: 'Homey One' }];

    athomApi._user = {
      getHomeys: async () => homeys,
    };

    mock.method(athomApi, '_initApi', async () => {});
    mock.method(os, 'networkInterfaces', () => ({
      en0: [{ address: '10.0.0.55' }],
    }));
    const fetchSpy = mock.method(global, 'fetch', async () => ({
      headers: {
        get: (name) => (name === 'x-homey-id' ? 'homey-1' : null),
      },
    }));

    const initialResult = await athomApi.getHomeys({ cache: false, local: false });
    assert.strictEqual(initialResult[0].usb, undefined);

    const enrichedResult = await athomApi.getHomeys({ cache: true, local: true });

    assert.strictEqual(fetchSpy.mock.callCount(), 1);
    assert.strictEqual(enrichedResult[0].usb, '10.0.0.1');
  });

  it('sets usb address when local ping returns a matching Homey id', async () => {
    const athomApi = new AthomApi();
    const homeys = [{ id: 'homey-1', name: 'Homey One' }];

    athomApi._user = {
      getHomeys: async () => homeys,
    };

    mock.method(athomApi, '_initApi', async () => {});
    mock.method(os, 'networkInterfaces', () => ({
      en0: [{ address: '10.0.0.55' }],
      lo: [{ address: '127.0.0.1' }],
    }));
    mock.method(global, 'fetch', async (url, options) => {
      assert.strictEqual(url, 'http://10.0.0.1/api/manager/webserver/ping');
      assert.ok(options.signal, 'Expected fetch timeout signal to be set');
      return {
        headers: {
          get: (name) => (name === 'x-homey-id' ? 'homey-1' : null),
        },
      };
    });

    const result = await athomApi.getHomeys({ cache: false, local: true });

    assert.strictEqual(result[0].usb, '10.0.0.1');
  });

  it('ignores unmatched Homey ids from local ping responses', async () => {
    const athomApi = new AthomApi();
    const homeys = [{ id: 'homey-1', name: 'Homey One' }];

    athomApi._user = {
      getHomeys: async () => homeys,
    };

    mock.method(athomApi, '_initApi', async () => {});
    mock.method(os, 'networkInterfaces', () => ({
      en0: [{ address: '10.0.0.55' }],
    }));
    mock.method(global, 'fetch', async () => ({
      headers: {
        get: (name) => (name === 'x-homey-id' ? 'unknown-homey' : null),
      },
    }));

    const result = await athomApi.getHomeys({ cache: false, local: true });

    assert.strictEqual(result[0].usb, undefined);
  });

  it('continues when local ping fetch fails', async () => {
    const athomApi = new AthomApi();
    const homeys = [{ id: 'homey-1', name: 'Homey One' }];

    athomApi._user = {
      getHomeys: async () => homeys,
    };

    mock.method(athomApi, '_initApi', async () => {});
    mock.method(os, 'networkInterfaces', () => ({
      en0: [{ address: '10.0.0.55' }],
    }));
    mock.method(global, 'fetch', async () => {
      throw new Error('timeout');
    });

    const result = await athomApi.getHomeys({ cache: false, local: true });

    assert.deepStrictEqual(result, homeys);
    assert.strictEqual(result[0].usb, undefined);
  });

  it('starts local ping probes in parallel for all candidate adapters', async () => {
    const athomApi = new AthomApi();
    const homeys = [{ id: 'homey-1', name: 'Homey One' }];
    const resolvers = [];
    const fetchCalls = [];

    athomApi._user = {
      getHomeys: async () => homeys,
    };

    mock.method(athomApi, '_initApi', async () => {});
    mock.method(os, 'networkInterfaces', () => ({
      en0: [{ address: '10.0.0.55' }],
      en1: [{ address: '10.0.1.55' }],
    }));
    mock.method(global, 'fetch', (url) => {
      fetchCalls.push(url);

      return new Promise((resolve) => {
        resolvers.push(resolve);
      });
    });

    const resultPromise = athomApi.getHomeys({ cache: false, local: true });
    while (fetchCalls.length < 2) {
      await new Promise((resolve) => {
        setImmediate(resolve);
      });
    }

    assert.strictEqual(fetchCalls.length, 2);
    assert.ok(fetchCalls.includes('http://10.0.0.1/api/manager/webserver/ping'));
    assert.ok(fetchCalls.includes('http://10.0.1.1/api/manager/webserver/ping'));

    resolvers[0]({
      headers: {
        get: () => null,
      },
    });
    resolvers[1]({
      headers: {
        get: () => null,
      },
    });

    const result = await resultPromise;
    assert.deepStrictEqual(result, homeys);
  });
});
