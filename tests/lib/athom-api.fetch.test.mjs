import assert from 'node:assert';
import os from 'node:os';
import { afterEach, describe, it, mock } from 'node:test';

import AthomApi from '../../lib/AthomApi.js';

afterEach(() => {
  mock.restoreAll();
});

describe('AthomApi local discovery fetch behavior', () => {
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
});
