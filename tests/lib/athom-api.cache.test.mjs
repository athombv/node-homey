import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';

import { APIError, AthomCloudAPI, HomeyAPIV3Local } from 'homey-api';

import AthomApi from '../../lib/AthomApi.js';
import SettingsStore from '../../lib/Settings.js';
import Settings from '../../services/Settings.js';

let directory;
let settings;
let now;
let originalPat;

const profile = {
  _id: 'user-1',
  firstname: 'Test',
  roleIds: ['app_developer_trusted'],
  devices: [],
  homeys: [
    {
      _id: 'homey-1',
      name: 'Homey One',
      platform: 'local',
      apiVersion: 3,
      localUrl: 'http://192.168.1.100',
    },
  ],
};

beforeEach(async () => {
  originalPat = process.env.HOMEY_PAT;
  delete process.env.HOMEY_PAT;
  directory = await mkdtemp(path.join(os.tmpdir(), 'homey-profile-cache-'));
  settings = new SettingsStore();
  settings._settingsPath = path.join(directory, 'settings.json');
  now = 1_000_000;

  mock.method(Date, 'now', () => {
    return now;
  });
  mock.method(Settings, 'get', async (key) => {
    return await settings.get(key);
  });
  mock.method(Settings, 'set', async (key, value) => {
    return await settings.set(key, value);
  });
  mock.method(Settings, 'unset', async (key) => {
    return await settings.unset(key);
  });
  mock.method(os, 'networkInterfaces', () => {
    return {};
  });
});

afterEach(async () => {
  mock.restoreAll();

  if (originalPat === undefined) {
    delete process.env.HOMEY_PAT;
  } else {
    process.env.HOMEY_PAT = originalPat;
  }

  await rm(directory, { recursive: true, force: true });
});

function createClient(response = profile) {
  // Re-read the real settings file, as a new CLI process would.
  settings._settings = null;
  const client = new AthomApi();
  client._createApi();
  const request = mock.method(client._api, 'call', async ({ path: requestPath }) => {
    assert.equal(requestPath, '/user/me');

    if (response instanceof Error) {
      throw response;
    }

    return structuredClone(response);
  });

  return { client, request };
}

describe('AthomApi persistent profile cache', () => {
  it('reuses SDK profiles and Homeys from disk without another cloud request', async () => {
    await settings.set('homeyApi', { token: { access_token: 'stored-token' } });
    const first = createClient();
    await first.client.getHomeys({ local: false });

    const next = createClient(new Error('Cloud must not be called'));
    const cached = await next.client.getProfile();
    const homeys = await next.client.getHomeys({ local: false });

    assert.equal(first.request.mock.callCount(), 1);
    assert.equal(next.request.mock.callCount(), 0);
    assert.equal(cached.id, 'user-1');
    assert.equal(cached.hasRole('app_developer_trusted'), true);
    assert.ok(homeys[0] instanceof AthomCloudAPI.Homey);
    assert.equal(homeys[0].localUrl, 'http://192.168.1.100');
    assert.equal((await settings.get('homeyApi')).token.access_token, 'stored-token');
  });

  it('refreshes expired data and persists the updated Homey details', async () => {
    await createClient().client.getProfile();
    now += 5 * 60 * 1000;

    const updated = structuredClone(profile);
    updated.homeys[0].localUrl = 'http://192.168.1.101';
    const next = createClient(updated);
    const homey = await next.client.getHomey('homey-1');

    assert.equal(next.request.mock.callCount(), 1);
    assert.equal(homey.localUrl, updated.homeys[0].localUrl);
    assert.equal((await settings.get('homeyApi')).profileCache.updatedAt, now);
  });

  it('continues Homey execution on 429 and persists a cooldown across invocations', async () => {
    await createClient().client.getProfile();
    await settings.set('activeHomey', { id: 'homey-1' });
    await settings.set('homeyApi', {
      ...(await settings.get('homeyApi')),
      'homey-homey-1': { token: 'homey-session-token', session: { id: 'session-1' } },
    });
    now += 5 * 60 * 1000;

    mock.method(HomeyAPIV3Local.prototype, 'discoverBaseUrl', async function () {
      assert.equal(this.id, 'homey-1');
      return { baseUrl: 'http://192.168.1.100' };
    });
    mock.method(HomeyAPIV3Local.prototype, 'call', async ({ path: requestPath }) => {
      assert.equal(requestPath, '/api/manager/system/');
      return { hostname: 'homey' };
    });
    const limited = createClient(new APIError('Too Many Requests', 429));
    const api = await limited.client.getActiveHomey();

    assert.ok(api instanceof HomeyAPIV3Local);
    assert.deepEqual(await api.system.getInfo({ $socket: false }), { hostname: 'homey' });
    assert.equal(limited.request.mock.callCount(), 1);

    const next = createClient(new Error('Do not retry during cooldown'));
    assert.equal((await next.client.getProfile({ cache: false })).id, 'user-1');
    assert.equal(next.request.mock.callCount(), 0);

    now += 60 * 1000;
    const recovered = createClient();
    await recovered.client.getProfile();
    assert.equal(recovered.request.mock.callCount(), 1);
    assert.equal((await settings.get('homeyApi')).profileCache.retryAfter, undefined);
  });

  it('propagates 429 when there is no cached profile', async () => {
    const error = new APIError('Too Many Requests', 429);
    const { client, request } = createClient(error);

    await assert.rejects(client.getProfile(), error);
    assert.equal(request.mock.callCount(), 1);
  });

  for (const statusCode of [401, 403, 500]) {
    it(`does not hide HTTP ${statusCode} behind cached data`, async () => {
      await createClient().client.getProfile();
      now += 5 * 60 * 1000;
      const error = new APIError('Request failed', statusCode);

      await assert.rejects(createClient(error).client.getProfile(), error);
    });
  }

  it('refreshes both the SDK user and Homey list when cache is false', async () => {
    const { client, request } = createClient();
    await client.getHomeys({ local: false });
    request.mock.mockImplementation(async () => {
      return { ...structuredClone(profile), homeys: [] };
    });

    assert.deepEqual(await client.getHomeys({ cache: false, local: false }), []);
    assert.equal(request.mock.callCount(), 2);
  });

  it('falls back on 429 even when a refresh was explicitly requested', async () => {
    await createClient().client.getProfile();
    const limited = createClient(new APIError('Too Many Requests', 429));

    assert.equal((await limited.client.getProfile({ cache: false })).id, 'user-1');
    assert.equal(limited.request.mock.callCount(), 1);
  });

  it('does not reuse an OAuth profile with a PAT, or across different PATs', async () => {
    await createClient().client.getProfile();
    process.env.HOMEY_PAT = 'test-pat-one';
    const error = new APIError('Too Many Requests', 429);

    await assert.rejects(createClient(error).client.getProfile(), error);
    await createClient().client.getProfile();
    assert.equal((await createClient(error).client.getProfile()).id, 'user-1');

    const persisted = await readFile(settings._settingsPath, 'utf8');
    assert.ok(!persisted.includes('test-pat-one'));
    process.env.HOMEY_PAT = 'test-pat-two';
    await assert.rejects(createClient(error).client.getProfile(), error);

    await createClient().client.getProfile();
    delete process.env.HOMEY_PAT;
    await assert.rejects(createClient(error).client.getProfile(), error);
  });

  it('clears persistent and in-memory profiles on logout', async () => {
    const { client } = createClient();
    await client.getHomeys({ local: false });
    await client.logout();

    assert.deepEqual(await settings.get('homeyApi'), {});
    assert.equal(client._user, null);
    assert.equal(client._homeys, null);
    const error = new APIError('Too Many Requests', 429);
    await assert.rejects(createClient(error).client.getProfile(), error);
  });
});
