import assert from 'node:assert';
import { describe, it } from 'node:test';

import { DEFAULT_DISCOVERY_STRATEGIES } from '../../lib/CliStateModel.mjs';
import { CliStateRepository } from '../../lib/CliStateRepository.mjs';
import { synchronizeLegacySelection } from '../../lib/LegacyCliStateAdapter.mjs';
import { OperatingSystemCredentialStore } from '../../lib/OperatingSystemCredentialStore.mjs';
import Settings from '../../services/Settings.js';

function createFixture(t, initialSettings = {}) {
  let settings = structuredClone(initialSettings);
  const keychain = new Map();
  let nextGetFailure = null;
  let nextUpdateFailure = null;
  let nextKeychainRemovalFailure = null;
  let beforeNextUpdate = null;

  t.mock.method(Settings, 'get', async (key) => {
    if (nextGetFailure) {
      const error = nextGetFailure;
      nextGetFailure = null;
      throw error;
    }

    return structuredClone(settings[key]);
  });
  t.mock.method(Settings, 'read', async () => {
    if (nextGetFailure) {
      const error = nextGetFailure;
      nextGetFailure = null;
      throw error;
    }

    return structuredClone(settings);
  });
  t.mock.method(Settings, 'update', async (updater) => {
    const nextSettings = structuredClone(settings);
    if (beforeNextUpdate) {
      const callback = beforeNextUpdate;
      beforeNextUpdate = null;
      await callback(nextSettings);
      settings = structuredClone(nextSettings);
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
    if (nextKeychainRemovalFailure) {
      const error = nextKeychainRemovalFailure;
      nextKeychainRemovalFailure = null;
      throw error;
    }

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
    failNextGet(error) {
      nextGetFailure = error;
    },
    failNextKeychainRemoval(error) {
      nextKeychainRemovalFailure = error;
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
  it('synchronizes legacy selections through the shared compatibility adapter', () => {
    const settings = {};

    synchronizeLegacySelection(settings, {
      id: 'legacy-homey',
      name: 'Legacy Homey',
      platform: 'local',
    });

    assert.strictEqual(settings.contextState.current, 'default');
    assert.strictEqual(settings.contextState.contexts.default.target.homeyId, 'legacy-homey');
    assert.strictEqual(settings.authenticationProfiles.profiles.default.authenticated, false);

    synchronizeLegacySelection(settings, null);

    assert.strictEqual(settings.contextState.current, null);
  });

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
    const profile = await fixture.repository.getAuthenticationProfile('default');

    assert.strictEqual(state.contextState.current, null);
    assert.strictEqual(state.authenticationProfiles.profiles.default.authenticated, true);
    assert.strictEqual(profile.usable, true);
  });

  it('does not treat an empty legacy login record as authenticated', async (t) => {
    const fixture = createFixture(t, {
      activeHomey: { id: 'legacy-homey', name: 'Legacy', platform: 'local' },
      homeyApi: {},
    });

    const state = await fixture.repository.read();
    const profile = await fixture.repository.getAuthenticationProfile('default');

    assert.strictEqual(state.legacy.hasAuthentication, false);
    assert.strictEqual(state.authenticationProfiles.profiles.default.authenticated, false);
    assert.strictEqual(profile.usable, false);
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

  it('reports a missing direct keychain credential as unusable', async (t) => {
    const fixture = createFixture(t, {
      contextState: {
        schemaVersion: 1,
        current: 'direct',
        contexts: {
          direct: {
            target: {},
            homeyAuthentication: {
              source: 'stored',
              credentialId: 'missing-keychain-token',
              store: 'keychain',
            },
            route: { type: 'address', address: 'http://127.0.0.1:1234' },
          },
        },
      },
      credentials: {
        schemaVersion: 1,
        defaultStore: 'settings',
        entries: {
          'missing-keychain-token': {
            kind: 'homeyToken',
            store: 'keychain',
          },
        },
      },
    });

    const context = await fixture.repository.getContext('direct');

    assert.strictEqual(context.health.status, 'unusable');
    assert.match(context.health.reasons[0], /Keychain Homey credentials are missing/);
  });

  it('cleans a newly written keychain token when context creation fails atomically', async (t) => {
    const fixture = createFixture(t);
    const originalUpdate = Settings.update;
    t.mock.restoreAll();
    const keychain = new Map();
    t.mock.method(Settings, 'get', async () => undefined);
    t.mock.method(Settings, 'read', async () => {
      return {};
    });
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

  it('preserves the primary write failure when staged keychain cleanup also fails', async (t) => {
    const warnings = [];
    t.mock.method(console, 'error', (message) => {
      warnings.push(message);
    });
    const fixture = createFixture(t);
    const writeError = new Error('write failed');
    fixture.failNextUpdate(writeError);
    fixture.failNextKeychainRemoval(new Error('keychain unavailable'));

    await assert.rejects(
      () => {
        return fixture.repository.createContext('lab', directContext(), {
          directToken: 'secret',
          store: 'keychain',
        });
      },
      (error) => {
        assert.strictEqual(error, writeError);

        return true;
      },
    );

    assert.strictEqual(fixture.keychain.size, 1);
    assert.match(warnings[0], /Context lab creation failed/);
    assert.match(warnings[0], /keychain unavailable/);
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
    assert.strictEqual(fixture.settings.credentials.entries[oldCredentialId], undefined);
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
    assert.strictEqual(
      fixture.settings.credentials.entries[keychainEntry.context.homeyAuthentication.credentialId],
      undefined,
    );
  });

  it('keeps a committed context removal successful when keychain cleanup fails', async (t) => {
    const warnings = [];
    t.mock.method(console, 'error', (message) => {
      warnings.push(message);
    });
    const fixture = createFixture(t);
    await fixture.repository.createContext('keychain', directContext(), {
      directToken: 'keychain-secret',
      store: 'keychain',
    });
    fixture.failNextKeychainRemoval(new Error('keychain unavailable'));

    const removed = await fixture.repository.removeContext('keychain');

    assert.ok(removed);
    assert.strictEqual(await fixture.repository.getContext('keychain'), null);
    assert.strictEqual(warnings.length, 1);
    assert.match(warnings[0], /Context keychain removal was committed/);
    assert.match(warnings[0], /keychain unavailable/);
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
    assert.strictEqual(byName.keychain.usable, false);
    assert.match(byName.keychain.reason, /keychain account credentials are missing/i);
    assert.strictEqual(byName.stored.usable, true);
    assert.match(byName.sourceless.reason, /no credential source/);
    assert.match(byName.unknownCredential.reason, /Stored account credentials are missing/);
    assert.match(byName.legacyMissing.reason, /legacy default login has no stored credentials/);
  });

  it('keeps an explicitly logged-out legacy profile unusable', async (t) => {
    const fixture = createFixture(t, {
      homeyApi: { token: { access_token: 'legacy-token' } },
      authenticationProfiles: {
        schemaVersion: 1,
        profiles: {
          default: {
            credentialSource: {
              type: 'oauth',
              credentialId: 'legacy-homey-api',
              store: 'settings',
              legacy: true,
            },
            authenticated: false,
          },
        },
      },
    });

    const profile = await fixture.repository.getAuthenticationProfile('default');

    assert.strictEqual(profile.usable, false);
    assert.match(profile.reason, /logged out/);
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
        entries: {
          'settings-id': { kind: 'oauth', value: {} },
          'keychain-id': { kind: 'oauth', store: 'keychain' },
        },
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
    assert.strictEqual(fixture.settings.credentials.entries['keychain-id'], undefined);
    assert.strictEqual(fixture.settings.homeyApi, null);
  });

  it('keeps a committed PAT login successful when old keychain cleanup fails', async (t) => {
    const warnings = [];
    t.mock.method(console, 'error', (message) => {
      warnings.push(message);
    });
    const fixture = createFixture(t, {
      authenticationProfiles: {
        schemaVersion: 1,
        profiles: {
          work: {
            credentialSource: {
              type: 'oauth',
              credentialId: 'old-keychain-id',
              store: 'keychain',
            },
          },
        },
      },
      credentials: {
        schemaVersion: 1,
        defaultStore: 'settings',
        entries: {
          'old-keychain-id': { kind: 'oauth', store: 'keychain' },
        },
      },
    });
    fixture.keychain.set('old-keychain-id', { kind: 'oauth', value: {} });
    fixture.failNextKeychainRemoval(new Error('keychain unavailable'));

    const profile = await fixture.repository.createPatAuthenticationProfile(
      'work',
      'WORK_PAT',
      {},
      { replace: true },
    );

    assert.strictEqual(profile.profile.credentialSource.variable, 'WORK_PAT');
    assert.strictEqual(fixture.keychain.has('old-keychain-id'), true);
    assert.strictEqual(fixture.settings.credentials.entries['old-keychain-id'], undefined);
    assert.match(warnings[0], /Authentication profile work PAT login was committed/);
  });

  it('replaces the credential source observed inside an atomic PAT update', async (t) => {
    const fixture = createFixture(t, {
      authenticationProfiles: {
        schemaVersion: 1,
        profiles: {
          work: {
            credentialSource: {
              type: 'oauth',
              credentialId: 'old-id',
              store: 'settings',
            },
          },
        },
      },
      credentials: {
        schemaVersion: 1,
        defaultStore: 'settings',
        entries: {
          'old-id': { kind: 'oauth', value: {} },
        },
      },
    });
    fixture.beforeUpdate((settings) => {
      settings.authenticationProfiles.profiles.work.credentialSource = {
        type: 'oauth',
        credentialId: 'concurrent-id',
        store: 'keychain',
      };
      delete settings.credentials.entries['old-id'];
      settings.credentials.entries['concurrent-id'] = {
        kind: 'oauth',
        store: 'keychain',
      };
      fixture.keychain.set('concurrent-id', { kind: 'oauth', value: {} });
    });

    const profile = await fixture.repository.createPatAuthenticationProfile(
      'work',
      'WORK_PAT',
      {},
      { replace: true },
    );

    assert.strictEqual(profile.profile.credentialSource.variable, 'WORK_PAT');
    assert.strictEqual(fixture.settings.credentials.entries['concurrent-id'], undefined);
    assert.strictEqual(fixture.keychain.has('concurrent-id'), false);
  });

  it('prepares, completes, discards, renames, logs out, and removes OAuth profiles', async (t) => {
    const fixture = createFixture(t);
    await assert.rejects(() => {
      return fixture.repository.prepareOAuthAuthenticationProfile('invalid', 'vault');
    }, /Unknown credential store/);
    await assert.rejects(() => {
      return fixture.repository.completeOAuthAuthenticationProfile(
        'Not Valid',
        { type: 'oauth', credentialId: 'unused', store: 'settings' },
        {},
      );
    }, /Invalid authentication profile name/);

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
    assert.strictEqual(fixture.settings.credentials.entries[source.credentialId], undefined);

    const discarded = await fixture.repository.prepareOAuthAuthenticationProfile('discarded');
    await fixture.repository.discardOAuthCredential(discarded);
    assert.strictEqual(fixture.settings.credentials.entries[discarded.credentialId], undefined);
    await fixture.repository.discardOAuthCredential({ type: 'patEnvironment' });
  });

  it('keeps a committed OAuth discard successful when keychain cleanup fails', async (t) => {
    const warnings = [];
    t.mock.method(console, 'error', (message) => {
      warnings.push(message);
    });
    const fixture = createFixture(t);
    const source = await fixture.repository.prepareOAuthAuthenticationProfile(
      'discarded',
      'keychain',
    );
    fixture.failNextKeychainRemoval(new Error('keychain unavailable'));

    await fixture.repository.discardOAuthCredential(source);

    assert.strictEqual(fixture.settings.credentials.entries[source.credentialId], undefined);
    assert.strictEqual(fixture.keychain.has(source.credentialId), true);
    assert.match(warnings[0], /Prepared OAuth credential discard was committed/);
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
        entries: {
          'settings-old': { kind: 'oauth', value: {} },
          'keychain-old': { kind: 'oauth', store: 'keychain' },
        },
      },
    });
    fixture.keychain.set('keychain-old', { kind: 'oauth', value: {} });

    for (const name of ['settings', 'keychain', 'default']) {
      const source = await fixture.repository.prepareOAuthAuthenticationProfile(`${name}-next`);
      await fixture.repository.completeOAuthAuthenticationProfile(name, source, {});
    }

    assert.strictEqual(fixture.settings.credentials.entries['settings-old'], undefined);
    assert.strictEqual(fixture.keychain.has('keychain-old'), false);
    assert.strictEqual(fixture.settings.credentials.entries['keychain-old'], undefined);
    assert.strictEqual(fixture.settings.homeyApi, null);

    const discardedKeychain = await fixture.repository.prepareOAuthAuthenticationProfile(
      'discard-keychain',
      'keychain',
    );
    await fixture.repository.discardOAuthCredential(discardedKeychain);
    assert.strictEqual(fixture.keychain.has(discardedKeychain.credentialId), false);
  });

  it('keeps a committed OAuth credential when previous keychain cleanup fails', async (t) => {
    const cleanupError = new Error('keychain cleanup failed');
    const fixture = createFixture(t, {
      authenticationProfiles: {
        schemaVersion: 1,
        profiles: {
          work: {
            accountId: 'account-1',
            credentialSource: {
              type: 'oauth',
              credentialId: 'old-keychain-id',
              store: 'keychain',
            },
          },
        },
      },
    });
    fixture.keychain.set('old-keychain-id', {
      kind: 'oauth',
      value: { token: { access_token: 'old-token' } },
    });
    const source = await fixture.repository.prepareOAuthAuthenticationProfile('work', 'settings');
    fixture.failNextKeychainRemoval(cleanupError);

    const completed = await fixture.repository.completeOAuthAuthenticationProfile('work', source, {
      accountId: 'account-1',
    });

    assert.strictEqual(completed.cleanupError, cleanupError);
    assert.deepStrictEqual(completed.profile.credentialSource, source);
    assert.deepStrictEqual(
      fixture.settings.authenticationProfiles.profiles.work.credentialSource,
      source,
    );
    assert.ok(fixture.settings.credentials.entries[source.credentialId]);
    assert.strictEqual(fixture.keychain.has('old-keychain-id'), true);
  });

  it('revalidates account identity inside an atomic OAuth completion', async (t) => {
    const fixture = createFixture(t, {
      authenticationProfiles: {
        schemaVersion: 1,
        profiles: {
          work: {
            accountId: 'account-1',
            credentialSource: {
              type: 'oauth',
              credentialId: 'old-id',
              store: 'settings',
            },
          },
        },
      },
      credentials: {
        schemaVersion: 1,
        defaultStore: 'settings',
        entries: {
          'old-id': { kind: 'oauth', value: {} },
        },
      },
    });
    const source = await fixture.repository.prepareOAuthAuthenticationProfile('work', 'settings');
    fixture.beforeUpdate((settings) => {
      settings.authenticationProfiles.profiles.work.accountId = 'account-2';
    });

    await assert.rejects(() => {
      return fixture.repository.completeOAuthAuthenticationProfile('work', source, {
        accountId: 'account-1',
      });
    }, /different Athom account/);

    assert.strictEqual(
      fixture.settings.authenticationProfiles.profiles.work.accountId,
      'account-2',
    );
    assert.strictEqual(
      fixture.settings.authenticationProfiles.profiles.work.credentialSource.credentialId,
      'old-id',
    );
  });

  it('marks a post-commit OAuth profile read failure as committed', async (t) => {
    const readError = new Error('settings read failed');
    const fixture = createFixture(t);
    const source = await fixture.repository.prepareOAuthAuthenticationProfile('work', 'settings');
    fixture.beforeUpdate(() => {
      fixture.failNextGet(readError);
    });

    await assert.rejects(
      () =>
        fixture.repository.completeOAuthAuthenticationProfile('work', source, {
          accountId: 'account-1',
        }),
      (error) => {
        assert.strictEqual(error.authenticationProfileCommitted, true);
        assert.strictEqual(error.cause, readError);
        return true;
      },
    );

    assert.deepStrictEqual(
      fixture.settings.authenticationProfiles.profiles.work.credentialSource,
      source,
    );
    assert.ok(fixture.settings.credentials.entries[source.credentialId]);
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

  it('requires migration before renaming the projected legacy profile', async (t) => {
    const fixture = createFixture(t, {
      homeyApi: { token: { access_token: 'legacy-token' } },
    });

    await assert.rejects(
      () => fixture.repository.renameAuthenticationProfile('default', 'work'),
      /must be migrated before it can be renamed/,
    );

    const state = await fixture.repository.read();
    assert.ok(state.authenticationProfiles.profiles.default);
    assert.strictEqual(state.authenticationProfiles.profiles.work, undefined);
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
    assert.strictEqual(fixture.settings.credentials.entries['old-id'], undefined);
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

  it('rejects a migration when the credential source changes concurrently', async (t) => {
    const fixture = createFixture(t, {
      authenticationProfiles: {
        schemaVersion: 1,
        profiles: {
          work: {
            accountId: 'account-1',
            credentialSource: { type: 'oauth', credentialId: 'old-id', store: 'settings' },
          },
        },
      },
      credentials: {
        schemaVersion: 1,
        defaultStore: 'settings',
        entries: {
          'old-id': { kind: 'oauth', value: { token: { access_token: 'old-token' } } },
        },
      },
    });
    fixture.beforeUpdate((settings) => {
      settings.authenticationProfiles.profiles.work.credentialSource = {
        type: 'oauth',
        credentialId: 'new-id',
        store: 'settings',
      };
      settings.credentials.entries['new-id'] = {
        kind: 'oauth',
        value: { token: { access_token: 'new-token' } },
      };
    });

    await assert.rejects(() => {
      return fixture.repository.migrateAuthenticationProfile('work', 'keychain');
    }, /changed while its credentials were being migrated/);

    assert.deepStrictEqual(fixture.settings.authenticationProfiles.profiles.work.credentialSource, {
      type: 'oauth',
      credentialId: 'new-id',
      store: 'settings',
    });
    assert.strictEqual(
      fixture.settings.credentials.entries['new-id'].value.token.access_token,
      'new-token',
    );
    assert.strictEqual(fixture.keychain.size, 0);
  });

  it('rejects a migration when settings credentials change under the same source', async (t) => {
    const fixture = createFixture(t, {
      authenticationProfiles: {
        schemaVersion: 1,
        profiles: {
          work: {
            accountId: 'account-1',
            credentialSource: { type: 'oauth', credentialId: 'old-id', store: 'settings' },
          },
        },
      },
      credentials: {
        schemaVersion: 1,
        defaultStore: 'settings',
        entries: {
          'old-id': { kind: 'oauth', value: { token: { access_token: 'old-token' } } },
        },
      },
    });
    fixture.beforeUpdate((settings) => {
      settings.credentials.entries['old-id'].value.token.access_token = 'new-token';
    });

    await assert.rejects(() => {
      return fixture.repository.migrateAuthenticationProfile('work', 'keychain');
    }, /changed while its credentials were being migrated/);

    assert.strictEqual(
      fixture.settings.credentials.entries['old-id'].value.token.access_token,
      'new-token',
    );
    assert.strictEqual(fixture.keychain.size, 0);
  });

  it('rejects a migration when legacy credentials change concurrently', async (t) => {
    const fixture = createFixture(t, {
      activeHomey: { id: 'legacy-homey', name: 'Legacy', platform: 'local' },
      homeyApi: { token: { access_token: 'old-token' } },
    });
    fixture.beforeUpdate((settings) => {
      settings.homeyApi.token.access_token = 'new-token';
    });

    await assert.rejects(() => {
      return fixture.repository.migrateAuthenticationProfile('default', 'keychain');
    }, /changed while its credentials were being migrated/);

    assert.strictEqual(fixture.settings.homeyApi.token.access_token, 'new-token');
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

    await assert.rejects(
      () => fixture.repository.resolveContextSelection(''),
      /Invalid context name/,
    );
    assert.strictEqual(
      (await fixture.repository.resolveContextSelection('explicit')).source,
      'argument',
    );
    assert.strictEqual((await fixture.repository.resolveContextSelection()).name, 'environment');
    process.env.HOMEY_CONTEXT = '';
    await assert.rejects(
      () => fixture.repository.resolveContextSelection(),
      /Invalid context name/,
    );
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

    assert.strictEqual(
      (await fixture.repository.evaluateContextHealth(context, state)).status,
      'degraded',
    );
    assert.strictEqual(
      (await fixture.repository.evaluateContextHealth(context, state, 'account')).status,
      'degraded',
    );
    assert.strictEqual(
      (await fixture.repository.evaluateContextHealth(context, state, 'homey')).status,
      'degraded',
    );
    state.credentials.entries = {};
    assert.strictEqual(
      (await fixture.repository.evaluateContextHealth(context, state)).status,
      'unusable',
    );
  });

  it('reports discovery strategies that are incompatible with Homey Cloud targets', async (t) => {
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
    const context = accountContext({
      target: { homeyId: 'cloud-1', platform: 'cloud' },
      route: { type: 'discovery', strategies: ['local', 'mdns'] },
    });

    const unusable = await fixture.repository.evaluateContextHealth(context, state);
    context.route.strategies.push('cloud');
    const degraded = await fixture.repository.evaluateContextHealth(context, state);

    assert.strictEqual(unusable.status, 'unusable');
    assert.match(unusable.reasons[0], /require cloud discovery/);
    assert.strictEqual(degraded.status, 'degraded');
    assert.match(degraded.reasons[0], /incompatible with Homey Cloud/);
  });
});
