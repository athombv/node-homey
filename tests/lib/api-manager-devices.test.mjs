import assert from 'node:assert';
import { describe, it } from 'node:test';

import { openDeviceInWebApp } from '../../bin/cmds/api/managers/devices.mjs';

describe('devices manager extension', () => {
  it('opens the selected Homey device URL when no --homey-id is provided', async () => {
    const openedUrls = [];

    const url = await openDeviceInWebApp({
      argv: {
        id: 'device-1',
      },
      openUrl: async (targetUrl) => {
        openedUrls.push(targetUrl);
      },
      homeyService: {
        getSelectedHomey: async () => ({
          id: 'homey-1',
        }),
      },
    });

    assert.strictEqual(url, 'https://my.homey.app/homeys/homey-1/devices/device-1');
    assert.deepStrictEqual(openedUrls, ['https://my.homey.app/homeys/homey-1/devices/device-1']);
  });

  it('prefers the explicit --homey-id value when provided', async () => {
    const openedUrls = [];

    const url = await openDeviceInWebApp({
      argv: {
        id: 'device-1',
        homeyId: 'target-homey',
      },
      openUrl: async (targetUrl) => {
        openedUrls.push(targetUrl);
      },
      homeyService: {
        getSelectedHomey: async () => ({
          id: 'selected-homey',
        }),
      },
    });

    assert.strictEqual(url, 'https://my.homey.app/homeys/target-homey/devices/device-1');
    assert.deepStrictEqual(openedUrls, [
      'https://my.homey.app/homeys/target-homey/devices/device-1',
    ]);
  });

  it('fails when there is no selected Homey and no --homey-id', async () => {
    await assert.rejects(
      () =>
        openDeviceInWebApp({
          argv: {
            id: 'device-1',
          },
          openUrl: async () => {},
          homeyService: {
            getSelectedHomey: async () => null,
          },
        }),
      /No active Homey selected\. Run `homey select` to choose one\./,
    );
  });
});
