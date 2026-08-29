import assert from 'node:assert';
import { describe, it } from 'node:test';

import { handler as migrateHandler } from '../../bin/cmds/auth/migrate.mjs';
import AuthenticationProfiles from '../../services/AuthenticationProfiles.js';

describe('CLI auth migrate handler', () => {
  it('warns but succeeds when migrated credentials cannot resolve identity', async (t) => {
    const identityError = new Error('Athom Cloud is offline');
    const errors = [];
    const output = [];
    const exits = [];

    t.mock.method(AuthenticationProfiles, 'migrateAuthenticationProfile', async () => {
      return {
        profile: {
          name: 'default',
          profile: {
            accountId: null,
            email: null,
            displayName: null,
            credentialSource: {
              type: 'oauth',
              credentialId: 'credential-1',
              store: 'settings',
            },
          },
          usable: true,
          reason: null,
          referencedBy: [],
        },
        identityError,
      };
    });
    t.mock.method(console, 'error', (message) => {
      errors.push(message);
    });
    t.mock.method(console, 'log', (message) => {
      output.push(message);
    });
    t.mock.method(process, 'exit', (code) => {
      exits.push(code);
    });

    await migrateHandler({ profile: 'default', to: 'settings', json: true });

    assert.deepStrictEqual(errors, [
      'Warning: credentials were migrated, but account identity could not be verified: Athom Cloud is offline',
    ]);
    assert.strictEqual(JSON.parse(output[0]).accountId, null);
    assert.deepStrictEqual(exits, [0]);
  });
});
