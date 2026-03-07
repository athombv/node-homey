import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

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
});
