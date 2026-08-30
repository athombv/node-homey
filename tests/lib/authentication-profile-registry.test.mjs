import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import AthomApi from '../../lib/AthomApi.js';
import { AuthenticationProfileRegistry } from '../../lib/AuthenticationProfileRegistry.mjs';
import LegacyAthomApi from '../../services/AthomApi.js';
import { CliState } from '../../services/CliState.mjs';

afterEach(() => {
  mock.restoreAll();
});

function mockLegacyProfile() {
  mock.method(CliState, 'getAuthenticationProfile', async () => {
    return {
      name: 'default',
      profile: {
        accountId: null,
        email: null,
        displayName: null,
        credentialSource: {
          type: 'oauth',
          credentialId: 'legacy-homey-api',
          store: 'settings',
          legacy: true,
        },
        authenticated: true,
      },
    };
  });
}

describe('AuthenticationProfileRegistry migration', () => {
  it('persists identity resolved from existing credentials', async () => {
    mockLegacyProfile();
    mock.method(AthomApi.prototype, 'getProfile', async () => {
      return {
        id: 'account-1',
        email: 'developer@example.com',
        firstname: 'Homey',
        lastname: 'Developer',
      };
    });
    const migrateAuthenticationProfile = mock.method(
      CliState,
      'migrateAuthenticationProfile',
      async (name, to, identityMetadata) => {
        assert.strictEqual(name, 'default');
        assert.strictEqual(to, 'keychain');
        assert.deepStrictEqual(identityMetadata, {
          accountId: 'account-1',
          email: 'developer@example.com',
          displayName: 'Homey Developer',
        });

        return { name: 'default' };
      },
    );
    const registry = new AuthenticationProfileRegistry();

    const result = await registry.migrateAuthenticationProfile('default', 'keychain');

    assert.deepStrictEqual(result, {
      profile: { name: 'default' },
      identityError: null,
    });
    assert.strictEqual(migrateAuthenticationProfile.mock.callCount(), 1);
  });

  it('continues migration when identity resolution is offline', async () => {
    const offlineError = new Error('Athom Cloud is offline');
    mockLegacyProfile();
    mock.method(AthomApi.prototype, 'getProfile', async () => {
      throw offlineError;
    });
    const migrateAuthenticationProfile = mock.method(
      CliState,
      'migrateAuthenticationProfile',
      async (name, to, identityMetadata) => {
        assert.strictEqual(name, 'default');
        assert.strictEqual(to, 'settings');
        assert.strictEqual(identityMetadata, null);

        return { name: 'default' };
      },
    );
    const registry = new AuthenticationProfileRegistry();

    const result = await registry.migrateAuthenticationProfile('default', 'settings');

    assert.deepStrictEqual(result, {
      profile: { name: 'default' },
      identityError: offlineError,
    });
    assert.strictEqual(migrateAuthenticationProfile.mock.callCount(), 1);
  });

  it('skips identity lookup for already pinned profiles', async () => {
    mock.method(CliState, 'getAuthenticationProfile', async () => ({
      profile: {
        accountId: 'account-1',
        credentialSource: {
          type: 'oauth',
          credentialId: 'credential-1',
          store: 'settings',
        },
      },
    }));
    const getProfile = mock.method(AthomApi.prototype, 'getProfile', async () => {
      throw new Error('should not fetch identity');
    });
    mock.method(CliState, 'migrateAuthenticationProfile', async () => ({ name: 'work' }));
    const registry = new AuthenticationProfileRegistry();

    const result = await registry.migrateAuthenticationProfile('work', 'keychain');

    assert.deepStrictEqual(result, { profile: { name: 'work' }, identityError: null });
    assert.strictEqual(getProfile.mock.callCount(), 0);
  });

  it('continues migration when Athom Cloud omits the canonical account ID', async () => {
    mockLegacyProfile();
    mock.method(AthomApi.prototype, 'getProfile', async () => ({ email: 'developer@example.com' }));
    mock.method(CliState, 'migrateAuthenticationProfile', async () => ({ name: 'default' }));
    const registry = new AuthenticationProfileRegistry();

    const result = await registry.migrateAuthenticationProfile('default', 'settings');

    assert.match(result.identityError.message, /did not return a canonical account ID/);
  });

  it('resolves identity from non-legacy unpinned credentials with a fresh client', async () => {
    mock.method(CliState, 'getAuthenticationProfile', async () => ({
      profile: {
        accountId: null,
        credentialSource: {
          type: 'oauth',
          credentialId: 'credential-1',
          store: 'settings',
        },
      },
    }));
    mock.method(CliState, 'migrateAuthenticationProfile', async () => ({ name: 'work' }));
    const registry = new AuthenticationProfileRegistry();
    const getClient = mock.method(registry, 'getClient', async (name, options) => {
      assert.strictEqual(name, 'work');
      assert.deepStrictEqual(options, { allowInteractiveLogin: false, fresh: true });
      return { getProfile: async () => ({ id: 'account-1' }) };
    });

    const result = await registry.migrateAuthenticationProfile('work', 'keychain');

    assert.strictEqual(result.identityError, null);
    assert.strictEqual(getClient.mock.callCount(), 1);
  });
});

describe('AuthenticationProfileRegistry selection and clients', () => {
  it('resolves explicit, context, and default profile names', async () => {
    const registry = new AuthenticationProfileRegistry();
    const resolveContextSelection = mock.method(CliState, 'resolveContextSelection', async () => ({
      context: { authenticationProfile: 'work' },
    }));

    assert.strictEqual(
      await registry.resolveProfileName({ explicitProfile: 'explicit' }),
      'explicit',
    );
    assert.strictEqual(await registry.resolveProfileName({ contextName: 'lab' }), 'work');
    resolveContextSelection.mock.mockImplementation(async () => null);
    assert.strictEqual(await registry.resolveProfileName(), 'default');
  });

  it('falls back to legacy auth only for the missing or legacy default profile', async () => {
    const registry = new AuthenticationProfileRegistry();
    const getAuthenticationProfile = mock.method(
      CliState,
      'getAuthenticationProfile',
      async () => null,
    );

    assert.strictEqual(await registry.getClient('default'), LegacyAthomApi);
    await assert.rejects(() => registry.getClient('work'), /profile does not exist/);

    getAuthenticationProfile.mock.mockImplementation(async () => ({
      profile: { credentialSource: { type: 'oauth', legacy: true } },
    }));
    assert.strictEqual(await registry.getClient('default'), LegacyAthomApi);
  });

  it('creates and caches PAT clients while checking a pinned identity', async (t) => {
    const originalPat = process.env.WORK_PAT;
    t.after(() => {
      if (originalPat === undefined) delete process.env.WORK_PAT;
      else process.env.WORK_PAT = originalPat;
    });
    process.env.WORK_PAT = 'secret';
    mock.method(CliState, 'getAuthenticationProfile', async () => ({
      profile: {
        accountId: 'account-1',
        credentialSource: { type: 'patEnvironment', variable: 'WORK_PAT' },
      },
    }));
    const getProfile = mock.method(AthomApi.prototype, 'getProfile', async () => ({
      id: 'account-1',
    }));
    const registry = new AuthenticationProfileRegistry();

    const first = await registry.getClient('work');
    const second = await registry.getClient('work');
    const fresh = await registry.getClient('work', { fresh: true });

    assert.strictEqual(first, second);
    assert.notStrictEqual(first, fresh);
    assert.strictEqual(getProfile.mock.callCount(), 2);
  });

  it('rejects missing PAT variables, unsupported sources, and account mismatches', async () => {
    delete process.env.MISSING_PAT;
    const getAuthenticationProfile = mock.method(
      CliState,
      'getAuthenticationProfile',
      async () => ({
        profile: { credentialSource: { type: 'patEnvironment', variable: 'MISSING_PAT' } },
      }),
    );
    const registry = new AuthenticationProfileRegistry();

    await assert.rejects(() => registry.getClient('work'), /MISSING_PAT is not set/);
    getAuthenticationProfile.mock.mockImplementation(async () => ({
      profile: { credentialSource: { type: 'magic' } },
    }));
    await assert.rejects(() => registry.getClient('work'), /no supported credential source/);

    process.env.MISSING_PAT = 'secret';
    getAuthenticationProfile.mock.mockImplementation(async () => ({
      profile: {
        accountId: 'expected',
        credentialSource: { type: 'patEnvironment', variable: 'MISSING_PAT' },
      },
    }));
    mock.method(AthomApi.prototype, 'getProfile', async () => ({ id: 'actual' }));
    await assert.rejects(
      () => registry.getClient('work'),
      /resolved to account actual, expected expected/,
    );
    delete process.env.MISSING_PAT;
  });

  it('supports settings and keychain OAuth client storage', async () => {
    const getAuthenticationProfile = mock.method(
      CliState,
      'getAuthenticationProfile',
      async () => ({
        profile: {
          accountId: null,
          credentialSource: { type: 'oauth', credentialId: 'settings-id', store: 'settings' },
        },
      }),
    );
    const registry = new AuthenticationProfileRegistry();

    assert.ok(await registry.getClient('settings', { fresh: true }));
    getAuthenticationProfile.mock.mockImplementation(async () => ({
      profile: {
        accountId: null,
        credentialSource: { type: 'oauth', credentialId: 'keychain-id', store: 'keychain' },
      },
    }));
    assert.ok(await registry.getClient('keychain', { fresh: true }));
  });

  it('lists only usable clients', async () => {
    mock.method(CliState, 'listAuthenticationProfiles', async () => [
      { name: 'one', usable: true },
      { name: 'two', usable: false },
      { name: 'three', usable: true },
    ]);
    const registry = new AuthenticationProfileRegistry();
    mock.method(registry, 'getClient', async (name, options) => {
      assert.deepStrictEqual(options, { allowInteractiveLogin: false });
      return { name };
    });

    assert.deepStrictEqual(await registry.listUsableClients(), [
      { name: 'one', client: { name: 'one' } },
      { name: 'three', client: { name: 'three' } },
    ]);
  });
});

describe('AuthenticationProfileRegistry login and logout', () => {
  it('logs in with a PAT and persists account metadata', async (t) => {
    const originalPat = process.env.WORK_PAT;
    t.after(() => {
      if (originalPat === undefined) delete process.env.WORK_PAT;
      else process.env.WORK_PAT = originalPat;
    });
    process.env.WORK_PAT = 'secret';
    const profile = {
      id: 'account-1',
      email: 'developer@example.com',
      firstname: 'Homey',
      lastname: 'Developer',
    };
    mock.method(AthomApi.prototype, 'getProfile', async () => profile);
    const createProfile = mock.method(CliState, 'createPatAuthenticationProfile', async () => {});
    const registry = new AuthenticationProfileRegistry();

    assert.strictEqual(
      await registry.loginWithPat('work', 'WORK_PAT', { replaceAccount: true }),
      profile,
    );
    assert.deepStrictEqual(createProfile.mock.calls[0].arguments, [
      'work',
      'WORK_PAT',
      {
        accountId: 'account-1',
        email: 'developer@example.com',
        displayName: 'Homey Developer',
      },
      { replace: true, replaceAccount: true },
    ]);
  });

  it('rejects PAT login when the environment variable is absent', async () => {
    delete process.env.MISSING_PAT;
    const registry = new AuthenticationProfileRegistry();

    await assert.rejects(
      () => registry.loginWithPat('work', 'MISSING_PAT'),
      /MISSING_PAT is not set/,
    );
  });

  it('rejects login responses without a canonical account ID', async (t) => {
    const originalPat = process.env.WORK_PAT;
    t.after(() => {
      if (originalPat === undefined) delete process.env.WORK_PAT;
      else process.env.WORK_PAT = originalPat;
    });
    process.env.WORK_PAT = 'secret';
    const source = { type: 'oauth', credentialId: 'credential-1', store: 'settings' };
    mock.method(AthomApi.prototype, 'getProfile', async () => ({
      email: 'developer@example.com',
    }));
    const createProfile = mock.method(CliState, 'createPatAuthenticationProfile', async () => {});
    mock.method(CliState, 'prepareOAuthAuthenticationProfile', async () => source);
    mock.method(AthomApi.prototype, 'login', async () => {});
    const completeProfile = mock.method(
      CliState,
      'completeOAuthAuthenticationProfile',
      async () => {},
    );
    const discardCredential = mock.method(CliState, 'discardOAuthCredential', async () => {});
    const registry = new AuthenticationProfileRegistry();

    await assert.rejects(() => registry.loginWithPat('work', 'WORK_PAT'), /canonical account ID/);
    await assert.rejects(() => registry.loginWithOAuth('work'), /canonical account ID/);

    assert.strictEqual(createProfile.mock.callCount(), 0);
    assert.strictEqual(completeProfile.mock.callCount(), 0);
    assert.strictEqual(discardCredential.mock.callCount(), 1);
  });

  it('completes OAuth login and discards prepared credentials on failure', async () => {
    const source = { type: 'oauth', credentialId: 'credential-1', store: 'settings' };
    mock.method(CliState, 'prepareOAuthAuthenticationProfile', async () => source);
    mock.method(AthomApi.prototype, 'login', async () => {});
    const getProfile = mock.method(AthomApi.prototype, 'getProfile', async () => ({
      id: 'account-1',
      firstname: 'Homey',
    }));
    const complete = mock.method(CliState, 'completeOAuthAuthenticationProfile', async () => {});
    const discard = mock.method(CliState, 'discardOAuthCredential', async () => {});
    const registry = new AuthenticationProfileRegistry();

    await registry.loginWithOAuth('work', { store: 'settings', replaceAccount: true });
    assert.deepStrictEqual(complete.mock.calls[0].arguments, [
      'work',
      source,
      { accountId: 'account-1', email: null, displayName: 'Homey' },
      { replaceAccount: true },
    ]);
    assert.strictEqual(discard.mock.callCount(), 0);

    const failure = new Error('profile failed');
    getProfile.mock.mockImplementation(async () => {
      throw failure;
    });
    await assert.rejects(() => registry.loginWithOAuth('broken'), failure);
    assert.strictEqual(discard.mock.callCount(), 1);

    const committedFailure = Object.assign(new Error('post-commit read failed'), {
      authenticationProfileCommitted: true,
    });
    getProfile.mock.mockImplementation(async () => ({ id: 'account-1' }));
    complete.mock.mockImplementation(async () => {
      throw committedFailure;
    });
    await assert.rejects(() => registry.loginWithOAuth('committed'), committedFailure);
    assert.strictEqual(discard.mock.callCount(), 1);
  });

  it('warns without failing when an obsolete keychain credential cannot be removed', async (t) => {
    const source = { type: 'oauth', credentialId: 'credential-1', store: 'settings' };
    const errors = [];
    mock.method(CliState, 'prepareOAuthAuthenticationProfile', async () => source);
    mock.method(AthomApi.prototype, 'login', async () => {});
    mock.method(AthomApi.prototype, 'getProfile', async () => ({ id: 'account-1' }));
    mock.method(CliState, 'completeOAuthAuthenticationProfile', async () => ({
      cleanupError: new Error('keychain unavailable'),
    }));
    const discard = mock.method(CliState, 'discardOAuthCredential', async () => {});
    t.mock.method(console, 'error', (...values) => {
      errors.push(values.join(' '));
    });
    const registry = new AuthenticationProfileRegistry();

    await registry.loginWithOAuth('work');

    assert.strictEqual(discard.mock.callCount(), 0);
    assert.match(errors[0], /previous keychain credential could not be removed/);
    assert.match(errors[0], /keychain unavailable/);
  });

  it('rejects logout for missing and PAT profiles', async () => {
    const getAuthenticationProfile = mock.method(
      CliState,
      'getAuthenticationProfile',
      async () => null,
    );
    const registry = new AuthenticationProfileRegistry();

    await assert.rejects(() => registry.logout('missing'), /profile does not exist/);
    getAuthenticationProfile.mock.mockImplementation(async () => ({
      profile: { credentialSource: { type: 'patEnvironment', variable: 'WORK_PAT' } },
    }));
    await assert.rejects(() => registry.logout('work'), /reads its PAT from WORK_PAT/);
  });

  it('logs out legacy and named OAuth profiles and evicts cached clients', async () => {
    const entries = [
      { profile: { credentialSource: { type: 'oauth', legacy: true } } },
      {
        profile: {
          accountId: 'account-1',
          credentialSource: { type: 'oauth', credentialId: 'id', store: 'settings' },
        },
      },
      {
        profile: {
          accountId: 'account-1',
          credentialSource: { type: 'oauth', credentialId: 'id', store: 'settings' },
        },
      },
    ];
    mock.method(CliState, 'getAuthenticationProfile', async () => entries.shift());
    const getProfile = mock.method(AthomApi.prototype, 'getProfile', async () => {
      throw new Error('logout must not verify identity');
    });
    const logout = mock.method(AthomApi.prototype, 'logout', async () => {});
    const markLoggedOut = mock.method(
      CliState,
      'markAuthenticationProfileLoggedOut',
      async () => {},
    );
    const registry = new AuthenticationProfileRegistry();

    await registry.logout('default');
    await registry.logout('work');

    assert.strictEqual(logout.mock.callCount(), 2);
    assert.strictEqual(getProfile.mock.callCount(), 0);
    assert.strictEqual(markLoggedOut.mock.callCount(), 2);
  });
});
