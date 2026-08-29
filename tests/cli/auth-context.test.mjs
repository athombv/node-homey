import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { describe, it } from 'node:test';

import { assertSuccess, createIsolatedHomeyHome, removeHomeyHome, runHomey } from './helpers.mjs';

function createContextSettings() {
  return {
    contextState: {
      schemaVersion: 1,
      current: 'lab',
      contexts: {
        lab: {
          target: { homeyId: 'homey-1' },
          authenticationProfile: 'work',
          route: { type: 'discovery', strategies: ['cloud'] },
        },
      },
    },
    authenticationProfiles: {
      schemaVersion: 1,
      profiles: {
        work: {
          accountId: 'account-1',
          email: 'developer@example.com',
          credentialSource: { type: 'patEnvironment', variable: 'WORK_PAT' },
          authenticated: true,
        },
      },
    },
    credentials: {
      schemaVersion: 1,
      defaultStore: 'settings',
      entries: {},
    },
  };
}

describe('CLI authentication profiles', () => {
  it('removes legacy file credentials when migrating the default profile', (t) => {
    const homeyHome = createIsolatedHomeyHome({
      homeyApi: {
        token: {
          access_token: 'legacy-access-token',
        },
      },
    });
    t.after(() => removeHomeyHome(homeyHome));

    const migrateResult = spawnSync(
      process.execPath,
      [
        '-e',
        "require('./services/CliState').migrateAuthenticationProfile('default', 'settings', { accountId: 'account-1', email: 'developer@example.com', displayName: 'Homey Developer' }).catch((err) => { console.error(err); process.exitCode = 1; });",
      ],
      {
        cwd: process.cwd(),
        encoding: 'utf8',
        env: {
          ...process.env,
          HOMEY_HOME: homeyHome,
        },
      },
    );
    assertSuccess(migrateResult, 'CliState.migrateAuthenticationProfile');

    const settings = JSON.parse(fs.readFileSync(`${homeyHome}/settings.json`, 'utf8'));
    assert.strictEqual(settings.homeyApi, null);
    assert.strictEqual(Object.values(settings.credentials.entries).length, 1);
    assert.strictEqual(settings.authenticationProfiles.profiles.default.accountId, 'account-1');
    assert.strictEqual(
      settings.authenticationProfiles.profiles.default.email,
      'developer@example.com',
    );

    const removeResult = runHomey(['auth', 'remove', 'default', '--json'], homeyHome);
    assertSuccess(removeResult, 'homey auth remove default');

    const inspectResult = runHomey(['auth', 'inspect', 'default', '--json'], homeyHome);
    assert.notStrictEqual(inspectResult.status, 0);
    assert.match(inspectResult.stderr, /Authentication profile does not exist/);
  });

  it('renames profile references atomically and redacts environment values', (t) => {
    const homeyHome = createIsolatedHomeyHome(createContextSettings());
    t.after(() => removeHomeyHome(homeyHome));
    const env = { WORK_PAT: 'secret-pat-value' };

    const renameResult = runHomey(['auth', 'rename', 'work', 'office', '--json'], homeyHome, {
      env,
    });
    assertSuccess(renameResult, 'homey auth rename work office');
    assert.doesNotMatch(renameResult.stdout, /secret-pat-value/);

    const settings = JSON.parse(fs.readFileSync(`${homeyHome}/settings.json`, 'utf8'));
    assert.strictEqual(settings.contextState.contexts.lab.authenticationProfile, 'office');
    assert.strictEqual(settings.authenticationProfiles.profiles.work, undefined);
    assert.ok(settings.authenticationProfiles.profiles.office);
  });

  it('requires confirmation before leaving dependant contexts broken', (t) => {
    const homeyHome = createIsolatedHomeyHome(createContextSettings());
    t.after(() => removeHomeyHome(homeyHome));

    const unconfirmed = runHomey(['auth', 'remove', 'work'], homeyHome);
    assert.notStrictEqual(unconfirmed.status, 0);
    assert.match(unconfirmed.stderr, /referenced by lab/);

    const confirmed = runHomey(['auth', 'remove', 'work', '--yes', '--json'], homeyHome);
    assertSuccess(confirmed, 'homey auth remove work --yes');
    assert.deepStrictEqual(JSON.parse(confirmed.stdout), {
      removed: 'work',
      affectedContexts: ['lab'],
    });

    const context = JSON.parse(runHomey(['context', 'inspect', 'lab', '--json'], homeyHome).stdout);
    assert.strictEqual(context.health.status, 'unusable');
    assert.match(context.health.reasons[0], /does not exist/);
  });

  it('changes the default store only for credentials created afterward', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const initial = runHomey(['auth', 'storage', '--json'], homeyHome);
    assertSuccess(initial, 'homey auth storage --json');
    assert.deepStrictEqual(JSON.parse(initial.stdout), { defaultStore: 'settings' });

    const update = runHomey(['auth', 'storage', 'keychain', '--json'], homeyHome);
    assertSuccess(update, 'homey auth storage keychain --json');
    assert.deepStrictEqual(JSON.parse(update.stdout), { defaultStore: 'keychain' });

    const settings = JSON.parse(fs.readFileSync(`${homeyHome}/settings.json`, 'utf8'));
    assert.strictEqual(settings.credentials.defaultStore, 'keychain');
  });
});
