import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import AthomApi from '../../lib/AthomApi.js';
import { AuthenticationProfileRegistry } from '../../lib/AuthenticationProfileRegistry.js';
import CliState from '../../services/CliState.js';

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
});
