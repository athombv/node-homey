import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import AthomApi from '../../lib/AthomApi.js';

afterEach(() => {
  mock.restoreAll();
});

describe('AthomApi login session behavior', () => {
  it('returns the browser callback code from the listener', async () => {
    const athomApi = new AthomApi();

    mock.method(athomApi, '_createApi', function () {
      this._api = {
        authenticateWithAuthorizationCode: async () => {},
      };
    });

    const session = await athomApi.createLoginSession();
    const loginUrl = new URL(session.url);
    const callbackPort = loginUrl.searchParams.get('port');
    const codePromise = session.waitForAuthorizationCode({
      timeoutMs: 100,
    });

    await fetch(`http://127.0.0.1:${callbackPort}/auth?code=browser-code`);

    assert.strictEqual(await codePromise, 'browser-code');
    session.close();
  });

  it('authenticates a manually submitted code through the shared auth primitive', async () => {
    const athomApi = new AthomApi();
    const authenticateCalls = [];
    const profile = {
      email: 'alice@example.com',
      firstname: 'Alice',
      lastname: 'Example',
    };

    mock.method(athomApi, '_createApi', function () {
      this._api = {
        authenticateWithAuthorizationCode: async (options) => {
          authenticateCalls.push(options);
        },
      };
    });
    mock.method(athomApi, 'getProfile', async () => profile);

    const session = await athomApi.createLoginSession();
    const result = await session.authenticateWithCode('  manual-code  ');

    assert.deepStrictEqual(authenticateCalls, [
      {
        code: 'manual-code',
      },
    ]);
    assert.strictEqual(result, profile);
    session.close();
  });

  it('closes the listener idempotently and ignores callbacks after cancellation', async () => {
    const athomApi = new AthomApi();

    mock.method(athomApi, '_createApi', function () {
      this._api = {
        authenticateWithAuthorizationCode: async () => {},
      };
    });

    const session = await athomApi.createLoginSession();
    const loginUrl = new URL(session.url);
    const callbackPort = loginUrl.searchParams.get('port');
    const codePromise = session.waitForAuthorizationCode({
      timeoutMs: 30,
    });

    session.close();
    session.close();

    await assert.rejects(() => fetch(`http://127.0.0.1:${callbackPort}/auth?code=late-code`));
    await assert.rejects(() => codePromise, /Timeout getting authorization code!/);
  });

  it('times out while waiting for the browser callback', async () => {
    const athomApi = new AthomApi();

    mock.method(athomApi, '_createApi', function () {
      this._api = {
        authenticateWithAuthorizationCode: async () => {},
      };
    });

    const session = await athomApi.createLoginSession();

    await assert.rejects(
      () =>
        session.waitForAuthorizationCode({
          timeoutMs: 10,
        }),
      /Timeout getting authorization code!/,
    );

    session.close();
  });
});
