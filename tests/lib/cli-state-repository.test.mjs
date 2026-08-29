import assert from 'node:assert';
import { describe, it } from 'node:test';

import { CliStateRepository, DEFAULT_DISCOVERY_STRATEGIES } from '../../lib/CliStateRepository.mjs';
import { OperatingSystemCredentialStore } from '../../lib/OperatingSystemCredentialStore.mjs';
import Settings from '../../services/Settings.js';

function createFixture(t, initialSettings = {}) {
  let settings = structuredClone(initialSettings);
  const keychain = new Map();
  let nextUpdateFailure = null;
  let beforeNextUpdate = null;

  t.mock.method(Settings, 'get', async (key) => {
    return structuredClone(settings[key]);
  });
  t.mock.method(Settings, 'update', async (updater) => {
    const nextSettings = structuredClone(settings);
    if (beforeNextUpdate) {
      const callback = beforeNextUpdate;
      beforeNextUpdate = null;
      await callback(nextSettings);
    }
    if (nextUpdateFailure) {
      const error = nextUpdateFailure;
      nextUpdateFailure = null;
      throw error;
    }
    await updater(nextSettings);
    settings = nextSettings;
  });
  t.mock.method(OperatingSystemCredentialStore, 'get', async (credentialId) => {
    return structuredClone(keychain.get(credentialId));
  });
  t.mock.method(OperatingSystemCredentialStore, 'set', async (credentialId, credential) => {
    keychain.set(credentialId, structuredClone(credential));
  });
  t.mock.method(OperatingSystemCredentialStore, 'remove', async (credentialId) => {
    keychain.delete(credentialId);
  });

  return {
    repository: new CliStateRepository(),
    get settings() {
      return structuredClone(settings);
    },
    keychain,
    failNextUpdate(error) {
      nextUpdateFailure = error;
    },
    beforeUpdate(callback) {
      beforeNextUpdate = callback;
    },
  };
}

function accountContext(overrides = {}) {
  return {
    target: { homeyId: 'homey-1', name: 'Office', platform: 'local' },
    authenticationProfile: 'work',
    route: { type: 'discovery', strategies: ['local', 'cloud'] },
    ...overrides,
  };
}

function directContext(overrides = {}) {
  return {
    target: {},
    homeyAuthentication: { source: 'environment', variable: 'HOMEY_TOKEN' },
    route: { type: 'address', address: 'http://127.0.0.1:1234' },
    ...overrides,
  };
}

describe('CliStateRepository contexts', () => {
  it('projects legacy settings without persisting them', async (t) => {
    const fixture = createFixture(t, {
      activeHomey: { id: 'legacy-homey', name: 'Legacy', platform: 'cloud' },
      homeyApi: { token: { access_token: 'legacy-token' } },
    });

    const state = await fixture.repository.read();

    assert.deepStrictEqual(state.contextState.contexts.default.route, {
      type: 'discovery',
      strategies: ['cloud'],
    });
    assert.strictEqual(state.contextState.current, 'default');
    assert.strictEqual(state.authenticationProfiles.profiles.default.authenticated, true);
    assert.deepStrictEqual(fixture.settings, {
      activeHomey: { id: 'legacy-homey', name: 'Legacy', platform: 'cloud' },
      homeyApi: { token: { access_token: 'legacy-token' } },
    });
  });

  it('projects a legacy login even when no Homey has been selected', async (t) => {
    const fixture = createFixture(t, {
      homeyApi: { token: { access_token: 'legacy-token' } },
    });

    const state = await fixture.repository.read();

    assert.strictEqual(state.contextState.current, null);
    assert.strictEqual(state.authenticationProfiles.profiles.default.authenticated, true);
  });

  it('rejects unsupported schemas and invalid identifiers', async (t) => {
    const fixture = createFixture(t, {
      contextState: { schemaVersion: 2, current: null, contexts: {} },
    });

    await assert.rejects(
      () => fixture.repository.read(),
      /Unsupported context state schema version/,
    );
    await assert.rejects(() => fixture.repository.getContext('Not Valid'), /Invalid context name/);
  });

  it('normalizes context routes, metadata, descriptions, and strategies', async (t) => {
    const fixture = createFixture(t);

    const created = await fixture.repository.createContext('lab', {
      description: 'Lab environment',
      target: { homeyId: 'homey-1', name: '', platform: 'local' },
      authenticationProfile: 'work',
      route: {
        type: 'discovery',
        strategies: ['local', 'local', 'cloud'],
      },
    });

    assert.deepStrictEqual(created.context, {
      description: 'Lab environment',
      target: { homeyId: 'homey-1', platform: 'local' },
      authenticationProfile: 'work',
      route: { type: 'discovery', strategies: ['local', 'cloud'] },
    });

    const direct = await fixture.repository.createContext(
      'direct',
      directContext({
        route: { type: 'address', address: 'https://homey.local///' },
      }),
    );
    assert.strictEqual(direct.context.route.address, 'https://homey.local');

    const usb = await fixture.repository.createContext(
      'usb',
      accountContext({
        route: { type: 'usb' },
      }),
    );
    assert.deepStrictEqual(usb.context.route, { type: 'usb' });

    const defaultLocal = await fixture.repository.createContext(
      'default-local',
      accountContext({
        route: undefined,
      }),
    );
    assert.deepStrictEqual(defaultLocal.context.route.strategies, DEFAULT_DISCOVERY_STRATEGIES);
    const defaultCloud = await fixture.repository.createContext(
      'default-cloud',
      accountContext({
        target: { homeyId: 'cloud-homey', platform: 'cloud' },
        route: undefined,
      }),
    );
    assert.deepStrictEqual(defaultCloud.context.route.strategies, ['cloud']);
  });

  it('rejects invalid context shapes before persistence', async (t) => {
    const fixture = createFixture(t);
    const cases = [
      [
        { target: {}, route: { type: 'discovery', strategies: ['cloud'] } },
        /requires an authentication profile/,
      ],
      [accountContext({ target: {} }), /Account-backed contexts require --homey-id/],
      [
        directContext({ route: { type: 'usb' } }),
        /Direct-only contexts require an explicit --address/,
      ],
      [accountContext({ route: { type: 'discovery', strategies: [] } }), /at least one strategy/],
      [
        accountContext({ route: { type: 'discovery', strategies: ['magic'] } }),
        /Unknown Homey discovery strategy/,
      ],
      [
        accountContext({ route: { type: 'address', address: 'not-a-url' } }),
        /absolute HTTP or HTTPS/,
      ],
      [
        accountContext({ route: { type: 'address', address: 'ftp://homey.local' } }),
        /Only HTTP and HTTPS/,
      ],
      [accountContext({ route: { type: 'unknown' } }), /Unknown context route type/],
      [accountContext({ authenticationProfile: 'Not Valid' }), /Invalid authentication profile/],
      [
        directContext({ homeyAuthentication: { source: 'environment', variable: '' } }),
        /requires a variable name/,
      ],
      [
        directContext({ homeyAuthentication: { source: 'stored', store: 'settings' } }),
        /requires a credential ID/,
      ],
      [
        directContext({
          homeyAuthentication: { source: 'stored', credentialId: 'cred-1', store: 'vault' },
        }),
        /Unknown credential store/,
      ],
      [
        directContext({ homeyAuthentication: { source: 'unknown' } }),
        /Unknown Homey credential source/,
      ],
    ];

    for (const [context, pattern] of cases) {
      await assert.rejects(() => fixture.repository.createContext('lab', context), pattern);
    }

    assert.deepStrictEqual(fixture.settings, {});
  });

  it('stores direct tokens in settings or the keychain and can activate them', async (t) => {
    const fixture = createFixture(t);

    const settingsEntry = await fixture.repository.createContext(
      'settings-token',
      directContext(),
      {
        directToken: 'settings-secret',
        store: 'settings',
        use: true,
      },
    );
    const settingsCredentialId = settingsEntry.context.homeyAuthentication.credentialId;
    assert.deepStrictEqual(fixture.settings.credentials.entries[settingsCredentialId], {
      kind: 'homeyToken',
      value: 'settings-secret',
    });
    assert.strictEqual(fixture.settings.activeHomey, null);

    const keychainEntry = await fixture.repository.createContext(
      'keychain-token',
      directContext(),
      {
        directToken: 'keychain-secret',
        store: 'keychain',
      },
    );
    const keychainCredentialId = keychainEntry.context.homeyAuthentication.credentialId;
    assert.deepStrictEqual(fixture.keychain.get(keychainCredentialId), {
      kind: 'homeyToken',
      value: 'keychain-secret',
    });
    assert.deepStrictEqual(fixture.settings.credentials.entries[keychainCredentialId], {
      kind: 'homeyToken',
      store: 'keychain',
    });

    await assert.rejects(
      () => fixture.repository.createContext('settings-token', directContext()),
      /Context already exists/,
    );

    const accountEntry = await fixture.repository.createContext(
      'active-account',
      accountContext(),
      {
        use: true,
      },
    );
    assert.ok(accountEntry.current);
    assert.deepStrictEqual(fixture.settings.activeHomey, {
      id: 'homey-1',
      name: 'Office',
      platform: 'local',
    });
  });

  it('cleans a newly written keychain token when context creation fails atomically', async (t) => {
    const fixture = createFixture(t);
    const originalUpdate = Settings.update;
    t.mock.restoreAll();
    const keychain = new Map();
    t.mock.method(Settings, 'get', async () => undefined);
    t.mock.method(Settings, 'update', async () => {
      throw new Error('write failed');
    });
    t.mock.method(OperatingSystemCredentialStore, 'set', async (id, value) => {
      keychain.set(id, value);
    });
    t.mock.method(OperatingSystemCredentialStore, 'remove', async (id) => {
      keychain.delete(id);
    });

    await assert.rejects(
      () =>
        fixture.repository.createContext('lab', directContext(), {
          directToken: 'secret',
          store: 'keychain',
        }),
      /write failed/,
    );
    assert.strictEqual(keychain.size, 0);
    assert.ok(originalUpdate);
  });

  it('detects a concurrent duplicate and removes its staged keychain token', async (t) => {
    const fixture = createFixture(t);
    fixture.beforeUpdate((settings) => {
      settings.contextState = {
        schemaVersion: 1,
        current: null,
        contexts: { lab: accountContext() },
      };
    });

    await assert.rejects(
      () =>
        fixture.repository.createContext('lab', directContext(), {
          directToken: 'secret',
          store: 'keychain',
        }),
      /Context already exists/,
    );
    assert.strictEqual(fixture.keychain.size, 0);
  });

  it('updates current target metadata and replaces stored credentials', async (t) => {
    const fixture = createFixture(t);
    await fixture.repository.createContext('lab', directContext(), {
      directToken: 'old-secret',
      store: 'settings',
      use: true,
    });
    const oldCredentialId =
      fixture.settings.contextState.contexts.lab.homeyAuthentication.credentialId;

    const updated = await fixture.repository.updateContext(
      'lab',
      (context) => {
        context.target = { homeyId: 'homey-2', name: 'New Homey', platform: 'cloud' };
        context.authenticationProfile = 'work';
        return context;
      },
      { directToken: 'new-secret', store: 'keychain' },
    );
    const newCredentialId = updated.context.homeyAuthentication.credentialId;

    assert.strictEqual(fixture.settings.credentials.entries[oldCredentialId], undefined);
    assert.deepStrictEqual(fixture.keychain.get(newCredentialId), {
      kind: 'homeyToken',
      value: 'new-secret',
    });
    assert.deepStrictEqual(fixture.settings.activeHomey, {
      id: 'homey-2',
      name: 'New Homey',
      platform: 'cloud',
    });
  });

  it('removes replaced keychain credentials and rejects invalid updates', async (t) => {
    const fixture = createFixture(t);
    const created = await fixture.repository.createContext('lab', directContext(), {
      directToken: 'old-secret',
      store: 'keychain',
    });
    const oldCredentialId = created.context.homeyAuthentication.credentialId;

    await fixture.repository.replaceContextDirectToken('lab', 'new-secret', 'settings');

    assert.strictEqual(fixture.keychain.has(oldCredentialId), false);
    await assert.rejects(
      () =>
        fixture.repository.updateContext('lab', (context) => context, {
          directToken: 'secret',
          store: 'vault',
        }),
      /Unknown credential store/,
    );
    await assert.rejects(
      () => fixture.repository.updateContext('missing', (context) => context),
      /Context does not exist/,
    );
  });

  it('removes staged keychain credentials when an update fails', async (t) => {
    const fixture = createFixture(t);
    await fixture.repository.createContext('lab', accountContext());
    fixture.failNextUpdate(new Error('write failed'));

    await assert.rejects(
      () =>
        fixture.repository.updateContext('lab', (context) => context, {
          directToken: 'secret',
          store: 'keychain',
        }),
      /write failed/,
    );
    assert.strictEqual(fixture.keychain.size, 0);
  });

  it('uses, clears, renames, and removes contexts while retaining a broken current reference', async (t) => {
    const fixture = createFixture(t);
    await fixture.repository.createContext('lab', accountContext());
    await fixture.repository.createContext(
      'other',
      accountContext({
        target: { homeyId: 'homey-2' },
      }),
    );

    await fixture.repository.useContext('lab');
    assert.deepStrictEqual(await fixture.repository.getSelectedTarget(), {
      id: 'homey-1',
      name: 'Office',
      platform: 'local',
    });
    await fixture.repository.renameContext('lab', 'office');
    assert.strictEqual(fixture.settings.contextState.current, 'office');
    await assert.rejects(
      () => fixture.repository.renameContext('office', 'other'),
      /Context already exists/,
    );
    await fixture.repository.removeContext('office');
    assert.strictEqual(fixture.settings.contextState.current, 'office');
    await assert.rejects(
      () => fixture.repository.getSelectedTarget(),
      /Current context.*does not exist/,
    );

    await fixture.repository.clearCurrentContext();
    assert.strictEqual(await fixture.repository.getSelectedTarget(), null);
    await assert.rejects(() => fixture.repository.useContext('missing'), /Context does not exist/);
    await assert.rejects(
      () => fixture.repository.removeContext('missing'),
      /Context does not exist/,
    );
    await assert.rejects(
      () => fixture.repository.renameContext('missing', 'new'),
      /Context does not exist/,
    );
  });

  it('removes settings and keychain credentials together with their contexts', async (t) => {
    const fixture = createFixture(t);
    const settingsEntry = await fixture.repository.createContext('settings', directContext(), {
      directToken: 'settings-secret',
      store: 'settings',
    });
    const keychainEntry = await fixture.repository.createContext('keychain', directContext(), {
      directToken: 'keychain-secret',
      store: 'keychain',
    });

    await fixture.repository.removeContext('settings');
    await fixture.repository.removeContext('keychain');

    assert.strictEqual(
      fixture.settings.credentials.entries[settingsEntry.context.homeyAuthentication.credentialId],
      undefined,
    );
    assert.strictEqual(
      fixture.keychain.has(keychainEntry.context.homeyAuthentication.credentialId),
      false,
    );
  });

  it('lists contexts and manages the default credential store', async (t) => {
    const fixture = createFixture(t);
    assert.strictEqual(await fixture.repository.getDefaultCredentialStore(), 'settings');
    assert.strictEqual(await fixture.repository.setDefaultCredentialStore('keychain'), 'keychain');
    assert.strictEqual(await fixture.repository.getDefaultCredentialStore(), 'keychain');
    await assert.rejects(
      () => fixture.repository.setDefaultCredentialStore('vault'),
      /Unknown credential store/,
    );

    await fixture.repository.createContext('lab', accountContext());
    await fixture.repository.useContext('lab');
    const contexts = await fixture.repository.listContexts();
    assert.strictEqual(contexts.length, 1);
    assert.strictEqual(contexts[0].current, true);
  });

  it('synchronizes legacy selection and chooses cloud-only routing for cloud Homeys', async (t) => {
    const fixture = createFixture(t);

    await fixture.repository.setLegacySelection({
      id: 'cloud-homey',
      name: 'Cloud Homey',
      platform: 'cloud',
    });

    assert.deepStrictEqual(fixture.settings.activeHomey, {
      id: 'cloud-homey',
      name: 'Cloud Homey',
      platform: 'cloud',
    });
    assert.deepStrictEqual(fixture.settings.contextState.contexts.default.route.strategies, [
      'cloud',
    ]);

    await fixture.repository.setLegacySelection({
      id: 'local-homey',
      name: 'Local Homey',
      platform: 'local',
    });
    assert.deepStrictEqual(
      fixture.settings.contextState.contexts.default.route.strategies,
      DEFAULT_DISCOVERY_STRATEGIES,
    );
  });
});

describe('CliStateRepository authentication profiles', () => {
  it('reports profile references and usability for every credential source', async (t) => {
    const originalPat = process.env.WORK_PAT;
    t.after(() => {
      if (originalPat === undefined) delete process.env.WORK_PAT;
      else process.env.WORK_PAT = originalPat;
    });
    process.env.WORK_PAT = 'pat';
    const fixture = createFixture(t, {
      contextState: {
        schemaVersion: 1,
        current: null,
        contexts: { lab: accountContext() },
      },
      authenticationProfiles: {
        schemaVersion: 1,
        profiles: {
          work: {
            credentialSource: { type: 'patEnvironment', variable: 'WORK_PAT' },
            authenticated: true,
          },
          loggedout: {
            credentialSource: { type: 'patEnvironment', variable: 'WORK_PAT' },
            authenticated: false,
          },
          missing: {
            credentialSource: { type: 'patEnvironment', variable: 'MISSING_PAT' },
            authenticated: true,
          },
          unsupported: { credentialSource: { type: 'magic' }, authenticated: true },
          keychain: {
            credentialSource: { type: 'oauth', credentialId: 'key', store: 'keychain' },
            authenticated: true,
          },
          stored: {
            credentialSource: { type: 'oauth', credentialId: 'oauth', store: 'settings' },
            authenticated: true,
          },
          sourceless: { authenticated: true },
          unknownCredential: {
            credentialSource: { type: 'oauth', credentialId: 'unknown', store: 'settings' },
            authenticated: true,
          },
          legacyMissing: {
            credentialSource: { type: 'oauth', legacy: true },
            authenticated: true,
          },
        },
      },
      credentials: {
        schemaVersion: 1,
        defaultStore: 'settings',
        entries: {
          oauth: { kind: 'oauth', value: { token: { access_token: 'token' } } },
          unknown: { kind: 'unknown', value: 'value' },
        },
      },
    });

    const profiles = await fixture.repository.listAuthenticationProfiles();
    const byName = Object.fromEntries(profiles.map((entry) => [entry.name, entry]));

    assert.strictEqual(byName.work.usable, true);
    assert.deepStrictEqual(byName.work.referencedBy, ['lab']);
    assert.match(byName.loggedout.reason, /logged out/);
    assert.match(byName.missing.reason, /MISSING_PAT is not set/);
    assert.match(byName.unsupported.reason, /Unknown authentication source/);
    assert.strictEqual(byName.keychain.usable, true);
    assert.strictEqual(byName.stored.usable, true);
    assert.match(byName.sourceless.reason, /no credential source/);
    assert.match(byName.unknownCredential.reason, /Stored account credentials are missing/);
    assert.match(byName.legacyMissing.reason, /legacy default login has no stored credentials/);
  });

  it('creates PAT profiles and protects canonical account identity', async (t) => {
    const fixture = createFixture(t);

    await assert.rejects(
      () => fixture.repository.createPatAuthenticationProfile('work', ''),
      /requires an environment variable name/,
    );
    await fixture.repository.createPatAuthenticationProfile('work', 'WORK_PAT', {
      accountId: 'account-1',
      email: 'one@example.com',
      displayName: 'One',
    });
    await assert.rejects(
      () => fixture.repository.createPatAuthenticationProfile('work', 'OTHER_PAT'),
      /already exists/,
    );
    await assert.rejects(
      () =>
        fixture.repository.createPatAuthenticationProfile(
          'work',
          'OTHER_PAT',
          {
            accountId: 'account-2',
          },
          { replace: true },
        ),
      /different Athom account/,
    );

    const replaced = await fixture.repository.createPatAuthenticationProfile(
      'work',
      'OTHER_PAT',
      { accountId: 'account-2' },
      { replace: true, replaceAccount: true },
    );
    assert.strictEqual(replaced.profile.accountId, 'account-2');
    assert.strictEqual(replaced.profile.credentialSource.variable, 'OTHER_PAT');
  });

  it('cleans replaced settings, keychain, and legacy OAuth sources during PAT login', async (t) => {
    const fixture = createFixture(t, {
      homeyApi: { token: { access_token: 'legacy' } },
      authenticationProfiles: {
        schemaVersion: 1,
        profiles: {
          settings: {
            credentialSource: { type: 'oauth', credentialId: 'settings-id', store: 'settings' },
          },
          keychain: {
            credentialSource: { type: 'oauth', credentialId: 'keychain-id', store: 'keychain' },
          },
          default: {
            credentialSource: { type: 'oauth', legacy: true },
          },
        },
      },
      credentials: {
        schemaVersion: 1,
        defaultStore: 'settings',
        entries: { 'settings-id': { kind: 'oauth', value: {} } },
      },
    });
    fixture.keychain.set('keychain-id', { kind: 'oauth', value: {} });

    await fixture.repository.createPatAuthenticationProfile(
      'settings',
      'SETTINGS_PAT',
      {},
      { replace: true },
    );
    await fixture.repository.createPatAuthenticationProfile(
      'keychain',
      'KEYCHAIN_PAT',
      {},
      { replace: true },
    );
    await fixture.repository.createPatAuthenticationProfile(
      'default',
      'DEFAULT_PAT',
      {},
      { replace: true },
    );

    assert.strictEqual(fixture.settings.credentials.entries['settings-id'], undefined);
    assert.strictEqual(fixture.keychain.has('keychain-id'), false);
    assert.strictEqual(fixture.settings.homeyApi, null);
  });

  it('prepares, completes, discards, renames, logs out, and removes OAuth profiles', async (t) => {
    const fixture = createFixture(t);
    const source = await fixture.repository.prepareOAuthAuthenticationProfile('work', 'keychain');
    assert.deepStrictEqual(fixture.keychain.get(source.credentialId), { kind: 'oauth', value: {} });

    const completed = await fixture.repository.completeOAuthAuthenticationProfile('work', source, {
      accountId: 'account-1',
      email: 'one@example.com',
      displayName: 'One',
    });
    assert.strictEqual(completed.profile.accountId, 'account-1');
    await assert.rejects(
      () =>
        fixture.repository.completeOAuthAuthenticationProfile('work', source, {
          accountId: 'account-2',
        }),
      /different Athom account/,
    );

    await fixture.repository.createContext('lab', accountContext());
    await fixture.repository.renameAuthenticationProfile('work', 'office');
    assert.strictEqual(fixture.settings.contextState.contexts.lab.authenticationProfile, 'office');
    await fixture.repository.markAuthenticationProfileLoggedOut('office');
    assert.strictEqual(
      fixture.settings.authenticationProfiles.profiles.office.authenticated,
      false,
    );
    await fixture.repository.removeAuthenticationProfile('office');
    assert.strictEqual(fixture.keychain.has(source.credentialId), false);

    const discarded = await fixture.repository.prepareOAuthAuthenticationProfile('discarded');
    await fixture.repository.discardOAuthCredential(discarded);
    assert.strictEqual(fixture.settings.credentials.entries[discarded.credentialId], undefined);
    await fixture.repository.discardOAuthCredential({ type: 'patEnvironment' });
  });

  it('cleans staged keychain OAuth credentials when preparation fails', async (t) => {
    const fixture = createFixture(t);
    fixture.failNextUpdate(new Error('write failed'));

    await assert.rejects(
      () => fixture.repository.prepareOAuthAuthenticationProfile('work', 'keychain'),
      /write failed/,
    );
    assert.strictEqual(fixture.keychain.size, 0);
  });

  it('cleans previous settings, keychain, and legacy sources on OAuth completion', async (t) => {
    const fixture = createFixture(t, {
      homeyApi: { token: { access_token: 'legacy' } },
      authenticationProfiles: {
        schemaVersion: 1,
        profiles: {
          settings: {
            credentialSource: { type: 'oauth', credentialId: 'settings-old', store: 'settings' },
          },
          keychain: {
            credentialSource: { type: 'oauth', credentialId: 'keychain-old', store: 'keychain' },
          },
          default: { credentialSource: { type: 'oauth', legacy: true } },
        },
      },
      credentials: {
        schemaVersion: 1,
        defaultStore: 'settings',
        entries: { 'settings-old': { kind: 'oauth', value: {} } },
      },
    });
    fixture.keychain.set('keychain-old', { kind: 'oauth', value: {} });

    for (const name of ['settings', 'keychain', 'default']) {
      const source = await fixture.repository.prepareOAuthAuthenticationProfile(`${name}-next`);
      await fixture.repository.completeOAuthAuthenticationProfile(name, source, {});
    }

    assert.strictEqual(fixture.settings.credentials.entries['settings-old'], undefined);
    assert.strictEqual(fixture.keychain.has('keychain-old'), false);
    assert.strictEqual(fixture.settings.homeyApi, null);

    const discardedKeychain = await fixture.repository.prepareOAuthAuthenticationProfile(
      'discard-keychain',
      'keychain',
    );
    await fixture.repository.discardOAuthCredential(discardedKeychain);
    assert.strictEqual(fixture.keychain.has(discardedKeychain.credentialId), false);
  });

  it('rejects missing profile lifecycle operations and duplicate renames', async (t) => {
    const fixture = createFixture(t);
    await fixture.repository.saveAuthenticationProfile('one', {
      credentialSource: { type: 'patEnvironment', variable: 'ONE_PAT' },
      authenticated: true,
    });
    await fixture.repository.saveAuthenticationProfile('two', {
      credentialSource: { type: 'patEnvironment', variable: 'TWO_PAT' },
      authenticated: true,
    });

    await assert.rejects(
      () => fixture.repository.renameAuthenticationProfile('missing', 'new'),
      /does not exist/,
    );
    await assert.rejects(
      () => fixture.repository.renameAuthenticationProfile('one', 'two'),
      /already exists/,
    );
    await assert.rejects(
      () => fixture.repository.removeAuthenticationProfile('missing'),
      /does not exist/,
    );
    await assert.rejects(
      () => fixture.repository.markAuthenticationProfileLoggedOut('missing'),
      /does not exist/,
    );
  });

  it('removes settings credentials and clears the legacy default login', async (t) => {
    const fixture = createFixture(t, {
      homeyApi: { token: { access_token: 'legacy' } },
      authenticationProfiles: {
        schemaVersion: 1,
        profiles: {
          default: {
            credentialSource: { type: 'oauth', credentialId: 'oauth-id', store: 'settings' },
          },
        },
      },
      credentials: {
        schemaVersion: 1,
        defaultStore: 'settings',
        entries: { 'oauth-id': { kind: 'oauth', value: {} } },
      },
    });

    await fixture.repository.removeAuthenticationProfile('default');

    assert.strictEqual(fixture.settings.credentials.entries['oauth-id'], undefined);
    assert.strictEqual(fixture.settings.homeyApi, null);
  });

  it('migrates legacy credentials with identity and settings cleanup', async (t) => {
    const fixture = createFixture(t, {
      homeyApi: { token: { access_token: 'legacy-token' } },
      authenticationProfiles: {
        schemaVersion: 1,
        profiles: {
          default: {
            accountId: null,
            credentialSource: {
              type: 'oauth',
              credentialId: 'legacy-homey-api',
              store: 'settings',
              legacy: true,
            },
            authenticated: true,
          },
        },
      },
    });

    const result = await fixture.repository.migrateAuthenticationProfile('default', 'keychain', {
      accountId: 'account-1',
      email: 'one@example.com',
      displayName: 'One',
    });
    const credentialId = result.profile.credentialSource.credentialId;

    assert.strictEqual(result.profile.accountId, 'account-1');
    assert.strictEqual(fixture.settings.homeyApi, null);
    assert.deepStrictEqual(fixture.keychain.get(credentialId), {
      kind: 'oauth',
      value: { token: { access_token: 'legacy-token' } },
    });
  });

  it('moves OAuth credentials between stores and rejects invalid migrations', async (t) => {
    const fixture = createFixture(t);
    const source = await fixture.repository.prepareOAuthAuthenticationProfile('work', 'settings');
    await fixture.repository.completeOAuthAuthenticationProfile('work', source, {
      accountId: 'account-1',
    });

    const migrated = await fixture.repository.migrateAuthenticationProfile('work', 'keychain');
    assert.strictEqual(migrated.profile.credentialSource.store, 'keychain');
    assert.strictEqual(fixture.settings.credentials.entries[source.credentialId], undefined);
    const unchanged = await fixture.repository.migrateAuthenticationProfile('work', 'keychain');
    assert.strictEqual(
      unchanged.profile.credentialSource.credentialId,
      migrated.profile.credentialSource.credentialId,
    );

    await assert.rejects(
      () => fixture.repository.migrateAuthenticationProfile('work', 'vault'),
      /Unknown credential store/,
    );
    await assert.rejects(
      () => fixture.repository.migrateAuthenticationProfile('missing', 'settings'),
      /does not exist/,
    );
    await fixture.repository.createPatAuthenticationProfile('pat', 'PAT');
    await assert.rejects(
      () => fixture.repository.migrateAuthenticationProfile('pat', 'settings'),
      /Only persistent OAuth/,
    );
  });

  it('moves keychain OAuth credentials to settings and removes the original', async (t) => {
    const fixture = createFixture(t, {
      authenticationProfiles: {
        schemaVersion: 1,
        profiles: {
          work: {
            accountId: 'account-1',
            credentialSource: { type: 'oauth', credentialId: 'old-id', store: 'keychain' },
            authenticated: true,
          },
        },
      },
      credentials: {
        schemaVersion: 1,
        defaultStore: 'settings',
        entries: { 'old-id': { kind: 'oauth', store: 'keychain' } },
      },
    });
    fixture.keychain.set('old-id', {
      kind: 'oauth',
      value: { token: { access_token: 'token' } },
    });

    const result = await fixture.repository.migrateAuthenticationProfile('work', 'settings');

    assert.strictEqual(result.profile.credentialSource.store, 'settings');
    assert.strictEqual(fixture.keychain.has('old-id'), false);
  });

  it('rejects missing migration credentials and identity changes', async (t) => {
    const fixture = createFixture(t, {
      authenticationProfiles: {
        schemaVersion: 1,
        profiles: {
          missing: {
            credentialSource: { type: 'oauth', credentialId: 'missing-id', store: 'settings' },
          },
          identity: {
            accountId: 'account-1',
            credentialSource: { type: 'oauth', credentialId: 'identity-id', store: 'settings' },
          },
        },
      },
      credentials: {
        schemaVersion: 1,
        defaultStore: 'settings',
        entries: {
          'identity-id': { kind: 'oauth', value: { token: { access_token: 'token' } } },
        },
      },
    });

    await assert.rejects(
      () => fixture.repository.migrateAuthenticationProfile('missing', 'keychain'),
      /Stored credentials are missing/,
    );
    await assert.rejects(
      () =>
        fixture.repository.migrateAuthenticationProfile('identity', 'keychain', {
          accountId: 'account-2',
        }),
      /different Athom account/,
    );
    assert.strictEqual(fixture.keychain.size, 0);
  });

  it('cleans a staged keychain migration when the profile disappears concurrently', async (t) => {
    const fixture = createFixture(t, {
      authenticationProfiles: {
        schemaVersion: 1,
        profiles: {
          work: {
            credentialSource: { type: 'oauth', credentialId: 'old-id', store: 'settings' },
          },
        },
      },
      credentials: {
        schemaVersion: 1,
        defaultStore: 'settings',
        entries: { 'old-id': { kind: 'oauth', value: { token: { access_token: 'token' } } } },
      },
    });
    fixture.beforeUpdate((settings) => {
      delete settings.authenticationProfiles.profiles.work;
    });

    await assert.rejects(
      () => fixture.repository.migrateAuthenticationProfile('work', 'keychain'),
      /Authentication profile does not exist/,
    );
    assert.strictEqual(fixture.keychain.size, 0);
  });
});

describe('CliStateRepository context resolution', () => {
  it('resolves explicit, environment, and current selectors in order', async (t) => {
    const originalContext = process.env.HOMEY_CONTEXT;
    t.after(() => {
      if (originalContext === undefined) delete process.env.HOMEY_CONTEXT;
      else process.env.HOMEY_CONTEXT = originalContext;
    });
    const fixture = createFixture(t);
    for (const name of ['explicit', 'environment', 'current']) {
      await fixture.repository.createContext(
        name,
        accountContext({
          target: { homeyId: `homey-${name}` },
        }),
      );
    }
    await fixture.repository.useContext('current');
    process.env.HOMEY_CONTEXT = 'environment';

    assert.strictEqual(
      (await fixture.repository.resolveContextSelection('explicit')).source,
      'argument',
    );
    assert.strictEqual((await fixture.repository.resolveContextSelection()).name, 'environment');
    delete process.env.HOMEY_CONTEXT;
    assert.strictEqual((await fixture.repository.resolveContextSelection()).source, 'current');
    await fixture.repository.clearCurrentContext();
    assert.strictEqual(await fixture.repository.resolveContextSelection(), null);
  });

  it('annotates broken selection errors with their source', async (t) => {
    const originalContext = process.env.HOMEY_CONTEXT;
    t.after(() => {
      if (originalContext === undefined) delete process.env.HOMEY_CONTEXT;
      else process.env.HOMEY_CONTEXT = originalContext;
    });
    const fixture = createFixture(t);
    process.env.HOMEY_CONTEXT = 'missing';

    await assert.rejects(async () => {
      try {
        await fixture.repository.resolveContextSelection();
      } catch (error) {
        assert.strictEqual(error.selectionSource, 'environment');
        throw error;
      }
    }, /Selected context "missing" from environment/);
  });

  it('resolves direct tokens from environment, settings, and keychain', async (t) => {
    const originalToken = process.env.HOMEY_TOKEN;
    t.after(() => {
      if (originalToken === undefined) delete process.env.HOMEY_TOKEN;
      else process.env.HOMEY_TOKEN = originalToken;
    });
    const fixture = createFixture(t);
    process.env.HOMEY_TOKEN = 'environment-token';

    assert.strictEqual(await fixture.repository.resolveDirectToken(null), null);
    assert.strictEqual(
      await fixture.repository.resolveDirectToken({
        context: { homeyAuthentication: { source: 'environment', variable: 'HOMEY_TOKEN' } },
      }),
      'environment-token',
    );

    const settingsEntry = await fixture.repository.createContext('settings', directContext(), {
      directToken: 'settings-token',
    });
    const settingsSelection = await fixture.repository.resolveContextSelection('settings');
    assert.strictEqual(
      await fixture.repository.resolveDirectToken(settingsSelection),
      'settings-token',
    );

    const keychainEntry = await fixture.repository.createContext('keychain', directContext(), {
      directToken: 'keychain-token',
      store: 'keychain',
    });
    const keychainSelection = await fixture.repository.resolveContextSelection('keychain');
    assert.strictEqual(
      await fixture.repository.resolveDirectToken(keychainSelection),
      'keychain-token',
    );
    assert.ok(settingsEntry);
    assert.ok(keychainEntry);
  });

  it('evaluates ready, degraded, and unusable capability health', async (t) => {
    const fixture = createFixture(t);
    const state = {
      authenticationProfiles: {
        profiles: {
          work: {
            credentialSource: { type: 'oauth', credentialId: 'oauth', store: 'settings' },
            authenticated: true,
          },
        },
      },
      credentials: {
        entries: {
          oauth: { kind: 'oauth', value: { token: { access_token: 'token' } } },
        },
      },
      legacy: { hasAuthentication: false },
    };
    const context = {
      target: { homeyId: 'homey-1' },
      authenticationProfile: 'work',
      homeyAuthentication: { source: 'environment', variable: 'MISSING_HOMEY_TOKEN' },
      route: { type: 'discovery', strategies: ['cloud'] },
    };

    assert.strictEqual(fixture.repository.evaluateContextHealth(context, state).status, 'degraded');
    assert.strictEqual(
      fixture.repository.evaluateContextHealth(context, state, 'account').status,
      'degraded',
    );
    assert.strictEqual(
      fixture.repository.evaluateContextHealth(context, state, 'homey').status,
      'degraded',
    );
    state.credentials.entries = {};
    assert.strictEqual(fixture.repository.evaluateContextHealth(context, state).status, 'unusable');
  });
});
