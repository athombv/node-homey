import assert from 'node:assert';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, it, mock } from 'node:test';

import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';
import { handler } from '../../bin/cmds/list.mjs';

afterEach(() => {
  mock.restoreAll();
});

describe('CLI list', () => {
  it('prints a human-readable table by default', async () => {
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
    mock.method(AthomApi, 'getHomeys', async () => [
      {
        id: 'homey-a',
        name: 'Homey Alpha',
        platform: 'cloud',
        platformVersion: '2',
        softwareVersion: '12.0.0',
        apiVersion: '3',
        language: 'en',
        users: [{ id: '1' }],
        role: 'owner',
        region: 'eu-west-1',
        usb: null,
        state: 'online',
      },
    ]);

    await handler();

    const output = lines.join('\n');

    assert.strictEqual(exitCode, 0);
    assert.strictEqual(errorCalls, 0);
    assert.match(output, /Platform Version/);
    assert.match(output, /Homey Alpha/);
    assert.match(output, /owner/);
  });

  it('prints sorted JSON output when requested', async () => {
    const lines = [];
    let exitCode;

    mock.method(console, 'log', (...args) => {
      lines.push(args.join(' '));
    });
    mock.method(process, 'exit', (code) => {
      exitCode = code;
    });
    mock.method(AthomApi, 'getHomeys', async () => [
      {
        id: 'homey-b',
        name: 'Offline Homey',
        platform: 'cloud',
        platformVersion: '1',
        softwareVersion: '11.0.0',
        apiVersion: '2',
        language: 'nl',
        users: [],
        role: 'member',
        region: null,
        usb: null,
        state: 'offline',
      },
      {
        id: 'homey-a',
        name: 'Online Homey',
        platform: 'local',
        platformVersion: '2',
        softwareVersion: '12.0.0',
        apiVersion: '3',
        language: 'en',
        users: [{ id: '1' }, { id: '2' }],
        role: 'owner',
        region: 'eu-west-1',
        usb: '10.0.0.1',
        state: 'online',
      },
    ]);

    await handler({ json: true });

    const payload = JSON.parse(lines.join('\n'));

    assert.strictEqual(exitCode, 0);
    assert.deepStrictEqual(
      payload.map((homey) => homey.name),
      ['Online Homey', 'Offline Homey'],
    );
    assert.strictEqual(payload[0].usersCount, 2);
    assert.strictEqual(payload[0].usbAddress, '10.0.0.1');
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
    mock.method(AthomApi, 'getHomeys', async () => [
      {
        id: 'homey-a',
        name: 'Homey Alpha',
        platform: 'local',
        platformVersion: '2',
        softwareVersion: '12.0.0',
        apiVersion: '3',
        language: 'en',
        users: [{ id: '1' }],
        role: 'owner',
        region: 'eu-west-1',
        usb: null,
        state: 'online',
      },
    ]);

    await handler({ jq: '.[0].name' });

    assert.strictEqual(exitCode, 0);
    assert.strictEqual(lines[0], '"Homey Alpha"');
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
    mock.method(AthomApi, 'getHomeys', async () => {
      throw new Error('boom');
    });

    await handler({ json: true });

    assert.strictEqual(exitCode, 1);
    assert.strictEqual(errorCalls, 0);
    assert.match(JSON.parse(lines.join('\n')).error, /boom/);
  });
});
