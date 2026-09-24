import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, readFile, readdir, rm, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { promisify } from 'node:util';

import { APIError, AthomCloudAPI, HomeyAPIV3Local } from 'homey-api';

import AthomApi from '../../lib/AthomApi.js';
import { AthomApiProfileCache } from '../../lib/AthomApiProfileCache.js';
import SettingsStore from '../../lib/Settings.js';
import Settings from '../../services/Settings.js';
import Log from '../../lib/Log.js';

const execFileAsync = promisify(execFile);

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
  mock.method(Settings, 'getSettingsDirectory', () => {
    return directory;
  });
  mock.method(os, 'networkInterfaces', () => {
    return {};
  });
  await settings.set('homeyApi', { token: { access_token: 'oauth-token-one' } });
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
    await first.client.getHomeys({ usb: false });

    const next = createClient(new Error('Cloud must not be called'));
    const cached = await next.client.getProfile();
    const homeys = await next.client.getHomeys({ usb: false });

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
    assert.equal((await next.client._profileCache.get()).updatedAt, now);
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
    assert.equal((await recovered.client._profileCache.get()).retryAfter, undefined);
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
    await client.getHomeys({ usb: false });
    request.mock.mockImplementation(async () => {
      return { ...structuredClone(profile), homeys: [] };
    });

    assert.deepEqual(await client.getHomeys({ cache: false, usb: false }), []);
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

    const persisted = await readFile(path.join(directory, 'profile-cache.json'), 'utf8');
    assert.ok(!persisted.includes('test-pat-one'));
    process.env.HOMEY_PAT = 'test-pat-two';
    await assert.rejects(createClient(error).client.getProfile(), error);

    await createClient().client.getProfile();
    delete process.env.HOMEY_PAT;
    await assert.rejects(createClient(error).client.getProfile(), error);
  });

  it('uses the OAuth cache identity after authorization-code login with a PAT configured', async () => {
    process.env.HOMEY_PAT = 'test-pat-one';
    const { client, request } = createClient();
    await client.getProfile();
    mock.method(client._api, 'authenticateWithAuthorizationCode', async ({ code }) => {
      assert.equal(code, 'test-authorization-code');
      const token = { access_token: 'oauth-token-two' };
      await settings.set('homeyApi', { token });
      return token;
    });

    await client._authenticateWithAuthorizationCode({ code: 'test-authorization-code' });
    assert.equal((await client._profileCache.get()).user, undefined);
    request.mock.mockImplementation(async () => {
      return { ...structuredClone(profile), _id: 'oauth-user' };
    });
    assert.equal((await client.getProfile()).id, 'oauth-user');

    delete process.env.HOMEY_PAT;
    const oauth = createClient(new Error('OAuth profile should be cached'));
    assert.equal((await oauth.client.getProfile()).id, 'oauth-user');
    assert.equal(oauth.request.mock.callCount(), 0);

    process.env.HOMEY_PAT = 'test-pat-one';
    const pat = createClient();
    assert.equal((await pat.client.getProfile()).id, 'user-1');
    assert.equal(pat.request.mock.callCount(), 1);
  });

  for (const rateLimited of [false, true]) {
    it(`preserves another process's settings during ${rateLimited ? 'rate-limit fallback' : 'profile refresh'}`, async () => {
      await settings.set('homeyApi', { token: { access_token: 'original-token' } });
      await settings.set('activeHomey', { id: 'homey-1' });
      await createClient().client.getProfile();
      now += 5 * 60 * 1000;
      const { client, request } = createClient();
      // Load this process's settings snapshot before the other process changes it.
      await settings.get('homeyApi');
      const otherSettings = new SettingsStore();
      otherSettings._settingsPath = settings._settingsPath;
      const requestStarted = Promise.withResolvers();
      const response = Promise.withResolvers();
      request.mock.mockImplementation(async () => {
        requestStarted.resolve();
        return await response.promise;
      });

      const pendingProfile = client.getProfile();
      await requestStarted.promise;
      await otherSettings.set('activeHomey', { id: 'homey-2' });
      await otherSettings.set('homeyApi', { token: { access_token: 'new-token' } });

      if (rateLimited) {
        response.reject(new APIError('Too Many Requests', 429));
      } else {
        response.resolve(structuredClone(profile));
      }

      assert.equal((await pendingProfile).id, 'user-1');
      const persisted = JSON.parse(await readFile(settings._settingsPath, 'utf8'));
      assert.equal(persisted.activeHomey.id, 'homey-2');
      assert.equal(persisted.homeyApi.token.access_token, 'new-token');
    });
  }

  it('publishes complete profile entries when cache writers overlap', async () => {
    const entries = Array.from({ length: 20 }, (_, index) => {
      return {
        authKey: `auth-${index}`,
        user: { _id: `user-${index}`, name: 'x'.repeat(index * 1000) },
      };
    });
    const writePromises = entries.map((entry) => {
      return new AthomApiProfileCache().set(entry);
    });
    await Promise.all(writePromises);

    const persisted = await new AthomApiProfileCache().get();
    const expected = entries.find((entry) => {
      return entry.authKey === persisted.authKey;
    });
    assert.deepEqual(persisted, expected);
    assert.deepEqual((await readdir(directory)).sort(), ['profile-cache.json', 'settings.json']);
  });

  it('refreshes a corrupt cache without touching account settings', async () => {
    await settings.set('homeyApi', { token: { access_token: 'stored-token' } });
    await writeFile(path.join(directory, 'profile-cache.json'), '{');
    const { client, request } = createClient();

    assert.equal((await client.getProfile()).id, 'user-1');
    assert.equal(request.mock.callCount(), 1);
    assert.deepEqual(await settings.get('homeyApi'), { token: { access_token: 'stored-token' } });
  });

  for (const rateLimited of [false, true]) {
    it(`isolates a new OAuth login from an old pending ${rateLimited ? '429' : 'success'}`, async () => {
      const previous = createClient();
      await previous.client.getProfile();
      const started = Promise.withResolvers();
      const response = Promise.withResolvers();
      previous.request.mock.mockImplementation(async () => {
        started.resolve();
        return await response.promise;
      });

      const pending = previous.client.getProfile({ cache: false });
      await started.promise;
      const otherProfile = { ...structuredClone(profile), _id: 'other-account' };
      const current = createClient(otherProfile);
      mock.method(current.client._api, 'authenticateWithAuthorizationCode', async () => {
        const token = { access_token: 'other-account-token' };
        await settings.set('homeyApi', { token });
        return token;
      });
      await current.client._authenticateWithAuthorizationCode({ code: 'other-account-code' });
      await current.client.getProfile();

      if (rateLimited) {
        response.reject(new APIError('Too Many Requests', 429));
      } else {
        response.resolve(structuredClone(profile));
      }

      assert.equal((await pending).id, profile._id);
      const next = createClient(new Error('The new account profile should remain cached'));
      assert.equal((await next.client.getProfile()).id, 'other-account');
      assert.equal(next.request.mock.callCount(), 0);
      const persisted = await readFile(path.join(directory, 'profile-cache.json'), 'utf8');
      assert.ok(!persisted.includes('other-account-token'));
      assert.ok(!persisted.includes('oauth-token-one'));
    });
  }

  for (const rateLimited of [false, true]) {
    it(`rejects a pending ${rateLimited ? 'cooldown' : 'profile'} update after the same credential starts a new cache generation`, async () => {
      const previous = createClient();
      await previous.client.getProfile();
      const started = Promise.withResolvers();
      const response = Promise.withResolvers();
      previous.request.mock.mockImplementation(async () => {
        started.resolve();
        return await response.promise;
      });
      const pending = previous.client.getProfile({ cache: false });
      await started.promise;

      const updated = structuredClone(profile);
      updated.homeys[0].localUrl = 'http://192.168.1.101';
      const current = createClient(updated);
      await current.client._profileCache.clear();
      const marker = await current.client._profileCache.get();
      assert.deepEqual(Object.keys(marker), ['generation']);
      assert.equal(typeof marker.generation, 'string');
      await current.client.getProfile();

      if (rateLimited) {
        response.reject(new APIError('Too Many Requests', 429));
      } else {
        response.resolve(structuredClone(profile));
      }
      await pending;

      const stored = await current.client._profileCache.get();
      assert.deepEqual(stored.user, updated);
      assert.equal(stored.generation, marker.generation);
      assert.equal(stored.retryAfter, undefined);
    });
  }

  it('discards a pending cache write when login changes the same client', async () => {
    const { client, request } = createClient();
    await client.getProfile();
    const started = Promise.withResolvers();
    const response = Promise.withResolvers();
    request.mock.mockImplementation(async () => {
      started.resolve();
      return await response.promise;
    });
    const pending = client.getProfile({ cache: false });
    await started.promise;
    mock.method(client._api, 'authenticateWithAuthorizationCode', async () => {
      return { access_token: 'new-account-token' };
    });
    await client._authenticateWithAuthorizationCode({ code: 'new-account-code' });
    response.resolve(structuredClone(profile));
    await pending;

    assert.equal((await client._profileCache.get()).user, undefined);
    assert.equal((await client._profileCache.get()).authKey, undefined);
    request.mock.mockImplementation(async () => {
      return { ...structuredClone(profile), _id: 'new-account' };
    });
    assert.equal((await client.getProfile()).id, 'new-account');
  });

  it('keeps newer Homey details when an older profile request finishes last', async () => {
    const older = createClient();
    const started = Promise.withResolvers();
    const response = Promise.withResolvers();
    older.request.mock.mockImplementation(async () => {
      started.resolve();
      return await response.promise;
    });

    const pending = older.client.getProfile({ cache: false });
    await started.promise;

    now += 1000;
    const updated = structuredClone(profile);
    updated.homeys[0].localUrl = 'http://192.168.1.101';
    const newer = createClient(updated);
    const newerRequestStartedAt = now;
    await newer.client.getProfile({ cache: false });

    now += 1000;
    response.resolve(structuredClone(profile));
    await pending;

    const stored = await newer.client._profileCache.get();
    assert.deepEqual(stored.user, updated);
    assert.equal(stored.updatedAt, newerRequestStartedAt);

    const next = createClient(new Error('The newer profile should remain cached'));
    const homey = await next.client.getHomey('homey-1');
    assert.equal(homey.localUrl, updated.homeys[0].localUrl);
    assert.equal(next.request.mock.callCount(), 0);
  });

  for (const successFirst of [true, false]) {
    it(`preserves the refreshed profile and cooldown when ${successFirst ? 'success' : '429'} finishes first`, async () => {
      await createClient().client.getProfile();
      now += 5 * 60 * 1000;
      const fresh = createClient();
      const limited = createClient();
      const freshStarted = Promise.withResolvers();
      const limitedStarted = Promise.withResolvers();
      const freshResponse = Promise.withResolvers();
      const limitedResponse = Promise.withResolvers();
      fresh.request.mock.mockImplementation(async () => {
        freshStarted.resolve();
        return await freshResponse.promise;
      });
      limited.request.mock.mockImplementation(async () => {
        limitedStarted.resolve();
        return await limitedResponse.promise;
      });
      const freshPending = fresh.client.getProfile();
      const limitedPending = limited.client.getProfile();
      await Promise.all([freshStarted.promise, limitedStarted.promise]);
      const updated = { ...structuredClone(profile), homeys: [] };
      const rateLimitError = new APIError('Too Many Requests', 429);

      if (successFirst) {
        freshResponse.resolve(updated);
        await freshPending;
        limitedResponse.reject(rateLimitError);
        const fallback = await limitedPending;

        assert.deepEqual(await fallback.getHomeys(), []);
      } else {
        limitedResponse.reject(rateLimitError);
        await limitedPending;
        freshResponse.resolve(updated);
        await freshPending;
      }

      const stored = await fresh.client._profileCache.get();
      assert.deepEqual(stored.user, updated);
      assert.equal(stored.updatedAt, now);
      assert.equal(stored.retryAfter, now + 60 * 1000);
      const next = createClient(new Error('Must respect the concurrent cooldown'));
      const nextProfile = await next.client.getProfile({ cache: false });

      assert.deepEqual(await nextProfile.getHomeys(), []);
      assert.equal(next.request.mock.callCount(), 0);
    });
  }

  it('merges updates from separate processes under the same cache lock', async () => {
    const cache = new AthomApiProfileCache();
    await cache.set({ user: profile, authKey: 'shared', updatedAt: 0 });
    const retryAfter = Date.now() + 60 * 1000;
    const worker = `
      const { AthomApiProfileCache } = require('./lib/AthomApiProfileCache');
      const cache = new AthomApiProfileCache();
      async function update() {
        for (let index = 1; index <= 20; index++) {
          if (process.argv[1] === 'profile') {
            await cache.set({ user: { _id: 'updated' }, authKey: 'shared', updatedAt: index });
          } else {
            await cache.setRetryAfter({ authKey: 'shared', retryAfter: Number(process.argv[2]) });
          }
        }
      }
      // Keep the parent test's clock so cooldown expiry is deterministic.
      Date.now = () => { return Number(process.argv[3]); };
      update().catch((err) => { console.error(err); process.exitCode = 1; });
    `;
    const workers = ['profile', 'cooldown'].map((operation) => {
      return execFileAsync(
        process.execPath,
        ['-e', worker, operation, String(retryAfter), String(now)],
        {
          cwd: new URL('../../', import.meta.url),
          env: { ...process.env, HOMEY_HOME: directory },
        },
      );
    });
    await Promise.all(workers);

    assert.deepEqual(await cache.get(), {
      user: { _id: 'updated' },
      authKey: 'shared',
      updatedAt: 20,
      retryAfter,
    });
    assert.deepEqual((await readdir(directory)).sort(), ['profile-cache.json', 'settings.json']);
  });

  for (const rateLimited of [false, true]) {
    for (const code of ['ENOSPC', 'EACCES']) {
      it(`returns the ${rateLimited ? '429 fallback' : 'fetched profile'} when cache writes fail with ${code}`, async () => {
        await createClient().client.getProfile();
        const response = rateLimited ? new APIError('Too Many Requests', 429) : profile;
        const { client } = createClient(response);
        const error = Object.assign(new Error('Cache write failed'), { code });
        mock.method(client._profileCache, '_write', async () => {
          throw error;
        });
        const warning = mock.method(Log, 'warning', () => {});

        assert.equal((await client.getProfile({ cache: false })).id, profile._id);
        assert.equal(warning.mock.callCount(), 1);
        assert.equal(warning.mock.calls[0].arguments[1], error);
        assert.deepEqual((await readdir(directory)).sort(), [
          'profile-cache.json',
          'settings.json',
        ]);
      });
    }
  }

  it('fetches a profile when the cache cannot be read', async () => {
    const { client } = createClient();
    mock.method(client._profileCache, 'get', async () => {
      throw Object.assign(new Error('Cache read failed'), { code: 'EACCES' });
    });
    const warning = mock.method(Log, 'warning', () => {});

    assert.equal((await client.getProfile()).id, profile._id);
    assert.ok(warning.mock.callCount() > 0);
  });

  it('recovers a cache lock left by a terminated process', async () => {
    const lockPath = path.join(directory, 'profile-cache.json.lock');
    await mkdir(lockPath);
    const staleTime = new Date(now - 20 * 1000);
    await utimes(lockPath, staleTime, staleTime);
    const { client } = createClient();

    assert.equal((await client.getProfile()).id, profile._id);
    assert.equal((await client._profileCache.get()).user._id, profile._id);
    assert.deepEqual((await readdir(directory)).sort(), ['profile-cache.json', 'settings.json']);
  });

  it('keeps new OAuth credentials isolated even when clearing the old cache fails', async () => {
    const { client, request } = createClient();
    await client.getProfile();
    mock.method(client._api, 'authenticateWithAuthorizationCode', async () => {
      return { access_token: 'new-account-token' };
    });
    mock.method(client._profileCache, 'clear', async () => {
      throw Object.assign(new Error('Cache clear failed'), { code: 'EACCES' });
    });
    const warning = mock.method(Log, 'warning', () => {});

    await client._authenticateWithAuthorizationCode({ code: 'new-account-code' });
    request.mock.mockImplementation(async () => {
      return { ...structuredClone(profile), _id: 'new-account' };
    });
    assert.equal((await client.getProfile()).id, 'new-account');
    assert.equal(warning.mock.callCount(), 1);
  });

  it('does not reuse the cache without an OAuth credential', async () => {
    await createClient().client.getProfile();
    await settings.set('homeyApi', {});
    const error = new APIError('Too Many Requests', 429);

    await assert.rejects(createClient(error).client.getProfile(), error);
  });

  for (const rateLimited of [false, true]) {
    it(`keeps account data cleared after another process logs out during a pending ${rateLimited ? '429' : 'success'}`, async () => {
      const { client, request } = createClient();
      await client.getProfile();
      const started = Promise.withResolvers();
      const response = Promise.withResolvers();
      request.mock.mockImplementation(async () => {
        started.resolve();
        return await response.promise;
      });
      const pending = client.getProfile({ cache: false });
      await started.promise;

      await execFileAsync(
        process.execPath,
        [
          '-e',
          `
          const AthomApi = require('./lib/AthomApi');
          new AthomApi().logout().catch((err) => {
            console.error(err);
            process.exitCode = 1;
          });
        `,
        ],
        {
          cwd: new URL('../../', import.meta.url),
          env: { ...process.env, HOMEY_HOME: directory, HOMEY_PAT: '' },
        },
      );

      if (rateLimited) {
        response.reject(new APIError('Too Many Requests', 429));
      } else {
        response.resolve(structuredClone(profile));
      }
      await pending;

      const stored = await client._profileCache.get();
      assert.equal(stored?.user, undefined);
      assert.equal(stored?.authKey, undefined);
      assert.equal(stored?.retryAfter, undefined);
      const persisted = JSON.parse(await readFile(settings._settingsPath, 'utf8'));
      assert.deepEqual(persisted.homeyApi, {});
    });
  }

  it('clears persistent and in-memory profiles on logout', async () => {
    const { client } = createClient();
    await client.getHomeys({ usb: false });
    await client.logout();

    assert.deepEqual(await settings.get('homeyApi'), {});
    assert.equal(client._user, null);
    assert.equal(client._homeys.size, 0);
    assert.equal((await client._profileCache.get()).user, undefined);
    const error = new APIError('Too Many Requests', 429);
    await assert.rejects(createClient(error).client.getProfile(), error);
  });
});
