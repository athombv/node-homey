import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, it } from 'node:test';

import { createIsolatedHomeyHome, removeHomeyHome, runHomey, assertSuccess } from './helpers.mjs';

function createUsbFixture(t) {
  const token = 'test-oauth-token';
  const directory = createIsolatedHomeyHome({
    activeHomey: { id: 'homey-1', name: 'USB Homey', platform: 'local' },
    homeyApi: {
      token: { access_token: token },
      'homey-homey-1': { token: 'homey-token', session: { id: 'session-1' } },
    },
  });
  t.after(() => {
    removeHomeyHome(directory);
  });
  const profile = {
    _id: 'user-1',
    devices: [],
    homeys: ['homey-1', 'homey-2'].map((id) => {
      return {
        _id: id,
        name: id,
        platform: 'local',
        apiVersion: 3,
        softwareVersion: '12.0.0',
        state: 'offline',
      };
    }),
  };
  writeFileSync(
    path.join(directory, 'profile-cache.json'),
    JSON.stringify({
      user: profile,
      authKey: `oauth:${createHash('sha256').update(token).digest('hex')}`,
      updatedAt: Date.now(),
    }),
  );
  const logPath = path.join(directory, 'requests.jsonl');
  writeFileSync(logPath, '');
  const hookPath = path.join(directory, 'network.mjs');
  writeFileSync(
    hookPath,
    `
    import os from 'node:os';
    import { appendFileSync } from 'node:fs';
    import { createRequire } from 'node:module';
    const require = createRequire(process.cwd() + '/package.json');
    os.networkInterfaces = () => {
      return { eth0: [{ address: '10.0.0.2' }, { address: '10.0.0.3' }], vpn: [{ address: '10.1.0.2' }] };
    };
    globalThis.fetch = async (input) => {
      const url = new URL(input);
      appendFileSync(process.env.USB_TEST_LOG, JSON.stringify(url.href) + '\\n');
      if (url.pathname === '/api/manager/webserver/ping') {
        return new Response(null, { headers: { 'x-homey-id': url.hostname === '10.0.0.1' ? 'homey-1' : 'unknown' } });
      }
      if (url.hostname !== '10.0.0.1') throw new Error('Unexpected non-USB request: ' + url.hostname);
      if (process.env.USB_TEST_FAIL === '1') throw new Error('USB disconnected');
      return new Response(JSON.stringify({ id: 'session-1', via: 'usb' }), { headers: { 'content-type': 'application/json' } });
    };
    require('homey-api/lib/Util').fetch = globalThis.fetch;
  `,
  );
  return {
    directory,
    env: {
      HOMEY_PAT: '',
      HOMEY_USB: '',
      NODE_OPTIONS: `--import=${pathToFileURL(hookPath).href}`,
      USB_TEST_LOG: logPath,
    },
    requests() {
      const data = readFileSync(logPath, 'utf8').trim();
      if (!data) return [];
      return data.split('\n').map((line) => {
        return JSON.parse(line);
      });
    },
  };
}

describe('CLI USB mode', () => {
  for (const scenario of [
    { name: 'default', env: '', flags: [], count: 2, probes: 0 },
    { name: 'explicit flag', env: '', flags: ['--usb'], count: 1, probes: 2 },
    { name: 'shell default', env: '1', flags: [], count: 1, probes: 2 },
    { name: 'explicit opt-out', env: '1', flags: ['--no-usb'], count: 2, probes: 0 },
    {
      name: 'explicit opt-in over disabled shell',
      env: '0',
      flags: ['--usb'],
      count: 1,
      probes: 2,
    },
  ]) {
    it(`applies ${scenario.name} to list`, (t) => {
      const fixture = createUsbFixture(t);
      const result = runHomey(['list', '--json', ...scenario.flags], fixture.directory, {
        env: { ...fixture.env, HOMEY_USB: scenario.env },
      });
      assertSuccess(result, 'list');
      const homeys = JSON.parse(result.stdout);
      assert.equal(homeys.length, scenario.count);
      assert.equal(fixture.requests().length, scenario.probes);
      if (scenario.probes) assert.equal(homeys[0].usbAddress, '10.0.0.1');
    });
  }

  it('selects an offline USB Homey without persisting USB mode', (t) => {
    const fixture = createUsbFixture(t);
    const result = runHomey(['select', '--usb', '--id', 'homey-1'], fixture.directory, {
      env: fixture.env,
    });
    assertSuccess(result, 'select --usb');
    const settings = JSON.parse(
      readFileSync(path.join(fixture.directory, 'settings.json'), 'utf8'),
    );
    assert.deepEqual(settings.activeHomey, { id: 'homey-1', name: 'homey-1', platform: 'local' });
  });

  for (const command of [
    ['api', 'system', 'get-info'],
    ['api', 'system', 'get-info', '--token', 'test', '--homey-id', 'homey-1'],
    ['api', 'raw', '--path', '/api/manager/system/'],
    ['api', 'call', '--path', '/api/manager/system/'],
    ['api', 'request', '--path', '/api/manager/system/'],
  ]) {
    it(`routes ${command.join(' ')} through USB`, (t) => {
      const fixture = createUsbFixture(t);
      const result = runHomey([...command, '--usb', '--json'], fixture.directory, {
        env: fixture.env,
      });
      assertSuccess(result, command.join(' '));
      assert.equal(JSON.parse(result.stdout).via, 'usb');
      assert.ok(fixture.requests().includes('http://10.0.0.1/api/manager/system/'));
    });
  }

  for (const failed of [false, true]) {
    it(`reports USB-only diagnostic ${failed ? 'failure' : 'success'}`, (t) => {
      const fixture = createUsbFixture(t);
      const result = runHomey(['api', 'diagnose', '--usb', '--json'], fixture.directory, {
        env: { ...fixture.env, USB_TEST_FAIL: failed ? '1' : '' },
      });
      assert.equal(result.status, failed ? 1 : 0, result.stdout + result.stderr);
      const report = JSON.parse(result.stdout);
      assert.deepEqual(report.attemptedStrategyIds, ['usb']);
      assert.equal(report.results.length, 1);
      assert.equal(report.results[0].status, failed ? 'failed' : 'available');
    });
  }

  it('rejects USB mode with an explicit address before any network call', (t) => {
    const fixture = createUsbFixture(t);
    const result = runHomey(
      ['api', 'system', 'get-info', '--usb', '--token', 'test', '--address', 'http://localhost'],
      fixture.directory,
      { env: fixture.env },
    );
    assert.equal(result.status, 1);
    assert.match(result.stdout + result.stderr, /Cannot combine USB mode with --address/);
    assert.deepEqual(fixture.requests(), []);
  });

  it('allows an explicit address with --no-usb despite the shell default', (t) => {
    const fixture = createUsbFixture(t);
    const result = runHomey(
      [
        'api',
        'system',
        'get-info',
        '--no-usb',
        '--token',
        'test',
        '--address',
        'http://10.0.0.1',
        '--json',
      ],
      fixture.directory,
      {
        env: { ...fixture.env, HOMEY_USB: '1' },
      },
    );
    assertSuccess(result, 'api --no-usb --address');
    assert.deepEqual(fixture.requests(), ['http://10.0.0.1/api/manager/system/']);
  });

  for (const command of [['whoami'], ['select', 'current'], ['api', 'schema'], ['app', 'build']]) {
    it(`does not expose USB mode on ${command.join(' ')}`, (t) => {
      const fixture = createUsbFixture(t);
      const result = runHomey([...command, '--help'], fixture.directory, { env: fixture.env });
      assertSuccess(result, command.join(' '));
      assert.doesNotMatch(result.stdout, /--usb/);
    });
  }
});
