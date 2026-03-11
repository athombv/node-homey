import assert from 'node:assert';
import { afterEach, describe, it, mock } from 'node:test';

import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';
import { handler } from '../../bin/cmds/select.mjs';
import ApiHomeyTestHelpers from './api-homey-helpers.mjs';
import { createIsolatedHomeyHome, removeHomeyHome, runHomey } from './helpers.mjs';

const { assertFailure } = ApiHomeyTestHelpers;

afterEach(() => {
  mock.restoreAll();
});

describe('CLI select', () => {
  it('passes the selected Homey id to AthomApi', async () => {
    let exitCode;
    let selectionArgs;

    mock.method(AthomApi, 'selectActiveHomey', async (args) => {
      selectionArgs = args;
    });
    mock.method(process, 'exit', (code) => {
      exitCode = code;
    });

    await handler({ id: 'homey-1' });

    assert.strictEqual(exitCode, 0);
    assert.deepStrictEqual(selectionArgs, {
      id: 'homey-1',
      name: undefined,
    });
  });

  it('passes the selected Homey name to AthomApi', async () => {
    let exitCode;
    let selectionArgs;

    mock.method(AthomApi, 'selectActiveHomey', async (args) => {
      selectionArgs = args;
    });
    mock.method(process, 'exit', (code) => {
      exitCode = code;
    });

    await handler({ name: 'Living Room' });

    assert.strictEqual(exitCode, 0);
    assert.deepStrictEqual(selectionArgs, {
      id: undefined,
      name: 'Living Room',
    });
  });

  it('logs an error and exits with code 1 when selection fails', async () => {
    const expectedError = new Error('boom');
    let exitCode;
    let loggedError;

    mock.method(AthomApi, 'selectActiveHomey', async () => {
      throw expectedError;
    });
    mock.method(Log, 'error', (err) => {
      loggedError = err;
    });
    mock.method(process, 'exit', (code) => {
      exitCode = code;
    });

    await handler({ id: 'homey-1' });

    assert.strictEqual(exitCode, 1);
    assert.strictEqual(loggedError, expectedError);
  });

  it('rejects the removed --current flag', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['select', '--current'], homeyHome);

    assertFailure(result, 'homey select --current');
    assert.match(result.stderr, /Unknown argument: current/);
  });
});
