import assert from 'node:assert';
import { describe, it } from 'node:test';

import { AuthenticationProfiles } from '../../services/AuthenticationProfiles.mjs';
import { CliState } from '../../services/CliState.mjs';
import { refreshContextTargetMetadata } from '../../lib/ContextOperations.mjs';

describe('ContextOperations', () => {
  it('refreshes cached Homey metadata through the configured account profile', async (t) => {
    t.mock.method(CliState, 'getContext', async () => ({
      context: {
        target: { homeyId: 'homey-1', name: 'Old', platform: 'old' },
        authenticationProfile: 'work',
      },
    }));
    t.mock.method(AuthenticationProfiles, 'getClient', async (name, options) => {
      assert.strictEqual(name, 'work');
      assert.strictEqual(options.allowInteractiveLogin, process.stdin.isTTY);
      return {
        getHomey: async (homeyId) => {
          assert.strictEqual(homeyId, 'homey-1');
          return { name: 'New Homey', platform: 'local' };
        },
      };
    });
    t.mock.method(CliState, 'updateContext', async (name, updater) => {
      assert.strictEqual(name, 'lab');
      const context = {
        target: { homeyId: 'homey-1', name: 'Old', platform: 'old' },
        authenticationProfile: 'work',
      };
      return updater(context);
    });

    const result = await refreshContextTargetMetadata('lab');

    assert.deepStrictEqual(result.target, {
      homeyId: 'homey-1',
      name: 'New Homey',
      platform: 'local',
    });
  });

  it('rejects missing contexts', async (t) => {
    t.mock.method(CliState, 'getContext', async () => null);

    await assert.rejects(() => refreshContextTargetMetadata('missing'), /Context does not exist/);
  });

  it('requires both an account profile and Homey ID', async (t) => {
    const entries = [
      { context: { target: { homeyId: 'homey-1' } } },
      { context: { target: {}, authenticationProfile: 'work' } },
    ];
    t.mock.method(CliState, 'getContext', async () => entries.shift());

    await assert.rejects(
      () => refreshContextTargetMetadata('lab'),
      /requires an authentication profile and Homey ID/,
    );
    await assert.rejects(
      () => refreshContextTargetMetadata('lab'),
      /requires an authentication profile and Homey ID/,
    );
  });
});
