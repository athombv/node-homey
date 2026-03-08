import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, it, mock } from 'node:test';

import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';
import { handler } from '../../bin/cmds/whoami.mjs';

afterEach(() => {
  mock.restoreAll();
});

describe('CLI whoami', () => {
  it('prints profile and trusted developer label when trusted role is present', async () => {
    const lines = [];
    let errorCalls = 0;
    let exitCode;

    mock.method(console, 'log', (...args) => {
      lines.push(args.join(' '));
    });
    mock.method(Log, 'error', () => {
      errorCalls += 1;
    });
    mock.method(process, 'exit', (code) => {
      exitCode = code;
    });
    mock.method(AthomApi, 'getProfile', async () => ({
      firstname: 'Ada',
      lastname: 'Lovelace',
      email: 'ada@example.com',
      hasRole: (role) => role === 'app_developer_trusted',
    }));

    await handler();

    assert.strictEqual(exitCode, 0);
    assert.strictEqual(errorCalls, 0);
    assert.ok(lines.some((line) => line.includes('Ada Lovelace <ada@example.com>')));
    assert.ok(lines.some((line) => line.includes('Verified Developer')));
  });

  it('prints only profile details when trusted role is absent', async () => {
    const lines = [];
    let exitCode;

    mock.method(console, 'log', (...args) => {
      lines.push(args.join(' '));
    });
    mock.method(process, 'exit', (code) => {
      exitCode = code;
    });
    mock.method(AthomApi, 'getProfile', async () => ({
      firstname: 'Alan',
      lastname: 'Turing',
      email: 'alan@example.com',
      hasRole: () => false,
    }));

    await handler();

    assert.strictEqual(exitCode, 0);
    assert.ok(lines.some((line) => line.includes('Alan Turing <alan@example.com>')));
    assert.ok(lines.every((line) => !line.includes('Verified Developer')));
  });

  it('prints JSON output when requested', async () => {
    const lines = [];
    let exitCode;

    mock.method(console, 'log', (...args) => {
      lines.push(args.join(' '));
    });
    mock.method(process, 'exit', (code) => {
      exitCode = code;
    });
    mock.method(AthomApi, 'getProfile', async () => ({
      firstname: 'Grace',
      lastname: 'Hopper',
      email: 'grace@example.com',
      hasRole: (role) => role === 'app_developer_trusted',
    }));

    await handler({ json: true });

    assert.strictEqual(exitCode, 0);
    assert.deepStrictEqual(JSON.parse(lines.join('\n')), {
      id: null,
      firstname: 'Grace',
      lastname: 'Hopper',
      email: 'grace@example.com',
      isVerifiedDeveloper: true,
    });
  });

  it('supports jq output when jq is installed', async (t) => {
    const jqVersion = spawnSync('jq', ['--version'], {
      encoding: 'utf8',
    });

    if (jqVersion.status !== 0) {
      t.skip('jq is not installed in this environment');
      return;
    }

    const lines = [];
    let exitCode;

    mock.method(console, 'log', (...args) => {
      lines.push(args.join(' '));
    });
    mock.method(process, 'exit', (code) => {
      exitCode = code;
    });
    mock.method(AthomApi, 'getProfile', async () => ({
      firstname: 'Ada',
      lastname: 'Lovelace',
      email: 'ada@example.com',
      hasRole: () => false,
    }));

    await handler({ jq: '.email' });

    assert.strictEqual(exitCode, 0);
    assert.strictEqual(lines[0], '"ada@example.com"');
  });

  it('logs an error and exits with code 1 when profile retrieval fails', async () => {
    const expectedError = new Error('boom');
    let loggedError;
    let exitCode;

    mock.method(console, 'log', () => {});
    mock.method(Log, 'error', (err) => {
      loggedError = err;
    });
    mock.method(process, 'exit', (code) => {
      exitCode = code;
    });
    mock.method(AthomApi, 'getProfile', async () => {
      throw expectedError;
    });

    await handler();

    assert.strictEqual(exitCode, 1);
    assert.strictEqual(loggedError, expectedError);
  });

  it('prints a JSON error when requested', async () => {
    const lines = [];
    let errorCalls = 0;
    let exitCode;

    mock.method(console, 'log', (...args) => {
      lines.push(args.join(' '));
    });
    mock.method(Log, 'error', () => {
      errorCalls += 1;
    });
    mock.method(process, 'exit', (code) => {
      exitCode = code;
    });
    mock.method(AthomApi, 'getProfile', async () => {
      throw new Error('boom');
    });

    await handler({ json: true });

    assert.strictEqual(exitCode, 1);
    assert.strictEqual(errorCalls, 0);
    assert.match(JSON.parse(lines.join('\n')).error, /boom/);
  });
});
