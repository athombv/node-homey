import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import AthomMessage from '../../lib/AthomMessage.js';
import Settings from '../../services/Settings.js';

afterEach(() => {
  mock.restoreAll();
});

describe('AthomMessage fetch behavior', () => {
  it('caches the latest message when the fetch succeeds', async () => {
    const athomMessage = new AthomMessage();
    const settingsSetCalls = [];

    mock.method(athomMessage, '_showMessage', async () => 'shown');
    mock.method(Settings, 'get', async (key) => {
      if (key === 'athomMessageLastCheck') {
        return new Date(0).toString();
      }
      return null;
    });
    mock.method(Settings, 'set', async (...args) => {
      settingsSetCalls.push(args);
    });
    mock.method(global, 'fetch', async (url, options) => {
      assert.ok(options.signal, 'Expected fetch timeout signal to be set');
      return {
        ok: true,
        json: async () => ({ message: 'hello world' }),
      };
    });

    const result = await athomMessage.notify();

    assert.strictEqual(result, 'shown');
    assert.deepStrictEqual(settingsSetCalls[0], ['athomMessageCached', 'hello world']);
    assert.strictEqual(settingsSetCalls[1][0], 'athomMessageLastCheck');
  });

  it('returns undefined when the fetch result is not ok', async () => {
    const athomMessage = new AthomMessage();
    let showMessageCalls = 0;
    let settingsSetCalls = 0;

    mock.method(athomMessage, '_showMessage', async () => {
      showMessageCalls += 1;
      return 'shown';
    });
    mock.method(Settings, 'get', async (key) => {
      if (key === 'athomMessageLastCheck') {
        return new Date(0).toString();
      }
      return null;
    });
    mock.method(Settings, 'set', async () => {
      settingsSetCalls += 1;
    });
    mock.method(global, 'fetch', async () => ({
      ok: false,
    }));

    const result = await athomMessage.notify();

    assert.strictEqual(result, undefined);
    assert.strictEqual(showMessageCalls, 0);
    assert.strictEqual(settingsSetCalls, 0);
  });

  it('returns undefined when fetch throws', async () => {
    const athomMessage = new AthomMessage();

    mock.method(Settings, 'get', async (key) => {
      if (key === 'athomMessageLastCheck') {
        return new Date(0).toString();
      }
      return null;
    });
    mock.method(global, 'fetch', async () => {
      throw new Error('request failed');
    });

    const result = await athomMessage.notify();

    assert.strictEqual(result, undefined);
  });
});
