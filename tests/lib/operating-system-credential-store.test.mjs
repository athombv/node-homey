import assert from 'node:assert';
import { describe, it } from 'node:test';

import { Entry } from '@napi-rs/keyring';

import { OperatingSystemCredentialStore } from '../../lib/OperatingSystemCredentialStore.js';

describe('OperatingSystemCredentialStore', () => {
  it('returns parsed credentials or null when no password exists', async (t) => {
    const values = ['', JSON.stringify({ kind: 'homeyToken', value: 'secret' })];
    t.mock.method(Entry.prototype, 'getPassword', () => values.shift());

    assert.strictEqual(await OperatingSystemCredentialStore.get('missing'), null);
    assert.deepStrictEqual(await OperatingSystemCredentialStore.get('present'), {
      kind: 'homeyToken',
      value: 'secret',
    });
  });

  it('wraps invalid serialized credential data', async (t) => {
    t.mock.method(Entry.prototype, 'getPassword', () => '{invalid');

    await assert.rejects(
      () => OperatingSystemCredentialStore.get('broken'),
      (error) => {
        assert.match(error.message, /Credential broken contains invalid data/);
        assert.ok(error.cause instanceof SyntaxError);
        return true;
      },
    );
  });

  it('serializes credentials when storing them', async (t) => {
    const passwords = [];
    t.mock.method(Entry.prototype, 'setPassword', (value) => passwords.push(value));

    await OperatingSystemCredentialStore.set('credential-1', {
      kind: 'oauth',
      value: { token: { access_token: 'secret' } },
    });

    assert.deepStrictEqual(passwords.map(JSON.parse), [
      { kind: 'oauth', value: { token: { access_token: 'secret' } } },
    ]);
  });

  it('removes credentials and ignores platform-specific not-found errors', async (t) => {
    const errors = [null, new Error('No matching entry'), new Error('keyring unavailable')];
    t.mock.method(Entry.prototype, 'deletePassword', () => {
      const error = errors.shift();
      if (error) throw error;
    });

    await OperatingSystemCredentialStore.remove('present');
    await OperatingSystemCredentialStore.remove('missing');
    await assert.rejects(
      () => OperatingSystemCredentialStore.remove('broken'),
      /keyring unavailable/,
    );
  });

  it('handles non-Error not-found failures from native keyring implementations', async (t) => {
    t.mock.method(Entry.prototype, 'deletePassword', () => {
      throw 'entry not found';
    });

    await OperatingSystemCredentialStore.remove('missing');
  });
});
