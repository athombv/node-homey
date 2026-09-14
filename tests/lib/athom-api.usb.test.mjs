import assert from 'node:assert/strict';
import os from 'node:os';
import { afterEach, describe, it, mock } from 'node:test';
import inquirer from 'inquirer';
import { AthomCloudAPI, HomeyAPIV3Local } from 'homey-api';

import AthomApi from '../../lib/AthomApi.js';
import Settings from '../../services/Settings.js';
import AthomApiService from '../../services/AthomApi.js';
import { createHomeyApiClient, diagnoseHomeyStrategies } from '../../lib/api/ApiCommandRuntime.mjs';

const homeyProperties = {
  _id: 'homey-1',
  name: 'USB Homey',
  platform: 'local',
  apiVersion: 3,
  softwareVersion: '12.0.0',
  state: 'offline',
  localUrl: 'http://192.168.1.2',
  remoteUrl: 'https://homey.example',
};

afterEach(() => {
  mock.restoreAll();
  AthomApiService.discoveryStrategies = undefined;
});

function createClient(homeys = [homeyProperties]) {
  const client = new AthomApi();
  client._createApi();
  client._api = new AthomCloudAPI();
  const profile = new AthomCloudAPI.User({
    api: client._api,
    properties: { _id: 'user-1', devices: [], homeys: structuredClone(homeys) },
  });
  mock.method(client, 'getProfile', async () => {
    return profile;
  });
  mock.method(os, 'networkInterfaces', () => {
    return { eth0: [{ address: '10.0.0.2' }], vpn: [{ address: '10.1.0.2' }] };
  });
  return { client, profile };
}

function mockProbe(homeyId = 'homey-1') {
  return mock.method(global, 'fetch', async () => {
    return new Response(null, { headers: { 'x-homey-id': homeyId } });
  });
}

function mockUsbRequests(cloudApi) {
  mock.method(cloudApi, 'createDelegationToken', async () => {
    return 'delegation-token';
  });
  return mock.method(HomeyAPIV3Local.prototype, 'call', async function ({ path: requestPath }) {
    assert.match(await this.baseUrl, /^http:\/\/10\.[01]\.0\.1:80$/);
    assert.deepEqual(this.__strategies, []);
    if (requestPath === '/api/manager/users/login') return 'homey-token';
    return { id: 'session-1' };
  });
}

describe('USB opt-in discovery and connections', () => {
  it('makes no probes by default and keeps the full account list', async () => {
    const { client } = createClient([homeyProperties, { ...homeyProperties, _id: 'homey-2' }]);
    const fetch = mockProbe();
    const homeys = await client.getHomeys();

    assert.equal(homeys.length, 2);
    assert.equal(fetch.mock.callCount(), 0);
    assert.ok(homeys[0] instanceof AthomCloudAPI.Homey);
    assert.equal(homeys[0].usb, undefined);
  });

  it('isolates modes, refreshes both lists, and never adds USB metadata to the profile', async () => {
    const { client, profile } = createClient([
      homeyProperties,
      { ...homeyProperties, _id: 'homey-2' },
    ]);
    const fetch = mockProbe();
    const normal = await client.getHomeys();
    const usb = await client.getHomeys({ usb: true });

    assert.equal(usb.length, 1);
    assert.equal(usb[0].id, 'homey-1');
    assert.equal(usb[0].state, 'offline');
    assert.ok(usb[0].usb);
    assert.equal(normal[0].usb, undefined);
    assert.equal(profile.homeys[0].usb, undefined);
    assert.equal(await client.getHomeys(), normal);
    assert.equal(await client.getHomeys({ usb: true }), usb);
    assert.equal(fetch.mock.callCount(), 2);

    await client.getHomeys({ cache: false });
    await client.getHomeys({ usb: true });
    assert.equal(fetch.mock.callCount(), 4);
  });

  it('rejects a requested Homey when only an unrelated device answers', async () => {
    const { client } = createClient();
    mockProbe('another-account-homey');

    assert.deepEqual(await client.getHomeys({ usb: true }), []);
    await assert.rejects(client.getHomey('homey-1', { usb: true }), /not found over USB/);
  });

  for (const target of [
    { platform: 'cloud', apiVersion: 3 },
    { platform: 'local', apiVersion: 2 },
  ]) {
    it(`rejects unsupported USB target ${target.platform}/${target.apiVersion} without probing`, async () => {
      const { client } = createClient([{ ...homeyProperties, ...target }]);
      const fetch = mockProbe();

      await assert.rejects(
        client.getHomey('homey-1', { usb: true }),
        /USB requires a local API-v3/,
      );
      assert.equal(fetch.mock.callCount(), 0);
    });
  }

  it('selects a detected USB Homey even when Cloud says offline, without saving USB mode', async () => {
    const { client } = createClient();
    mockProbe();
    mock.method(inquirer, 'prompt', async ([question]) => {
      assert.equal(question.choices.length, 1);
      return { homey: question.choices[0].value };
    });
    const saved = mock.method(Settings, 'set', async (key, value) => {
      return value;
    });
    await client.selectActiveHomey({ usb: true });

    assert.deepEqual(saved.mock.calls[0].arguments, [
      'activeHomey',
      {
        id: 'homey-1',
        name: 'USB Homey',
        platform: 'local',
      },
    ]);
  });

  it('fails selection before prompting when no USB Homey is detected', async () => {
    const { client } = createClient();
    mockProbe('unknown');
    const prompt = mock.method(inquirer, 'prompt', async () => {});

    await assert.rejects(client.selectActiveHomey({ usb: true }), /No USB-connected Homey found/);
    assert.equal(prompt.mock.callCount(), 0);
  });

  it('uses USB for login and operations while keeping normal clients separate', async () => {
    const { client } = createClient();
    client.discoveryStrategies = ['cloud'];
    mockProbe();
    mock.method(Settings, 'get', async () => {
      return { id: 'homey-1' };
    });
    const requests = mockUsbRequests(client._api);
    const normalApi = {};
    const normal = mock.method(AthomCloudAPI.Homey.prototype, 'authenticate', async () => {
      return normalApi;
    });
    const normalClient = await client.getActiveHomey();
    const usbClient = await client.getActiveHomey({ usb: true });
    try {
      assert.equal(normalClient, normalApi);
      assert.ok(usbClient instanceof HomeyAPIV3Local);
      assert.equal(normal.mock.callCount(), 1);
      assert.equal(requests.mock.calls[0].arguments[0].path, '/api/manager/users/login');
      await usbClient.system.getInfo({ $socket: false });
      assert.equal(await client.getActiveHomey(), normalApi);
      assert.equal(await client.getActiveHomey({ usb: true }), usbClient);
      assert.equal(normal.mock.callCount(), 1);
    } finally {
      usbClient.destroy();
    }
  });

  it('propagates USB authentication failure without invoking normal authentication', async () => {
    const { client } = createClient();
    mockProbe();
    mock.method(Settings, 'get', async () => {
      return { id: 'homey-1' };
    });
    const failure = new Error('USB connection closed');
    mock.method(HomeyAPIV3Local.prototype, 'login', async () => {
      throw failure;
    });
    const normal = mock.method(AthomCloudAPI.Homey.prototype, 'authenticate', async () => {});

    await assert.rejects(client.getActiveHomey({ usb: true }), (err) => {
      assert.match(err.message, /over USB/);
      assert.equal(err.cause, failure);
      return true;
    });
    assert.equal(normal.mock.callCount(), 0);
  });

  it('uses the USB client for API operations and USB-only diagnostics', async () => {
    const { client } = createClient();
    AthomApiService.discoveryStrategies = ['cloud'];
    mockProbe();
    mockUsbRequests(client._api);
    mock.method(AthomApiService, 'getHomey', async (id, options) => {
      assert.deepEqual(options, { usb: true });
      return await client.getHomey(id, options);
    });
    mock.method(AthomApiService, '_initApi', async () => {
      return client._api;
    });
    const api = await createHomeyApiClient({ homeyId: 'homey-1', usb: true });
    try {
      assert.ok(api instanceof HomeyAPIV3Local);
      await api.system.getInfo({ $socket: false });
    } finally {
      api.destroy();
    }
    const report = await diagnoseHomeyStrategies({ homeyId: 'homey-1', usb: true });

    assert.deepEqual(report.attemptedStrategyIds, ['usb']);
    assert.deepEqual(report.availableStrategyIds, ['usb']);
    assert.equal(report.selectedStrategyId, 'usb');
    assert.match(report.selectedBaseUrl, /^http:\/\/10\.[01]\.0\.1:80$/);
    assert.equal(report.results.length, 1);
  });

  it('rejects enabled USB with an explicit address', async () => {
    await assert.rejects(
      createHomeyApiClient({ token: 'test', address: 'http://localhost', usb: true }),
      /Cannot combine USB mode with --address/,
    );
  });

  it('does not fall back to a LAN address in USB token mode', async () => {
    mock.method(AthomApiService, 'getHomey', async () => {
      return { ...homeyProperties, id: 'homey-1' };
    });
    await assert.rejects(
      createHomeyApiClient({ token: 'test', homeyId: 'homey-1', usb: true }),
      /not found over USB/,
    );
  });

  it('does not use stale USB metadata in normal token mode', async () => {
    mock.method(AthomApiService, 'getHomey', async () => {
      return { ...homeyProperties, id: 'homey-1', usb: '10.0.0.1' };
    });
    const api = await createHomeyApiClient({ token: 'test', homeyId: 'homey-1' });
    assert.equal(await api.baseUrl, homeyProperties.localUrl);
    api.destroy();
  });
});
