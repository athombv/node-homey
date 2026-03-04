'use strict';

import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { describe, it } from 'node:test';
import { assertSuccess, createIsolatedHomeyHome, removeHomeyHome, runHomey } from './helpers.mjs';
import ApiHomeyTestHelpers from './api-homey-helpers.mjs';

const { assertFailure } = ApiHomeyTestHelpers;

describe('CLI api homey devices', () => {
  it('shows manager help without requiring an active Homey', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'homey', 'devices', '--help'], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Devices manager operations/);
    assert.match(result.stdout, /get-devices/);
    assert.match(result.stdout, /--jq/);
  });

  it('provides dynamic completion entries for devices operations', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['--get-yargs-completions', 'api', 'homey', 'devices', ''], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /^get-devices$/m);
    assert.match(result.stdout, /^update-device$/m);
  });

  it('keeps partial operation tokens for completion filtering', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(
      ['--get-yargs-completions', 'api', 'homey', 'devices', 'get-d'],
      homeyHome,
    );

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /^get-device$/m);
    assert.match(result.stdout, /^get-devices$/m);
  });

  it('fails with guidance when no Homey is selected in normal mode', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'homey', 'devices'], homeyHome);

    assertFailure(result, 'homey api homey devices');
    assert.match(result.stdout, /No active Homey selected\. Run `homey select` to choose one\./);
  });

  it('returns JSON-formatted errors when --json is provided', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'homey', 'devices', '--json'], homeyHome);

    assertFailure(result, 'homey api homey devices --json');
    assert.doesNotThrow(() => JSON.parse(result.stdout));
    const payload = JSON.parse(result.stdout);
    assert.match(payload.error, /No active Homey selected/);
  });

  it('requires --address when --token is provided', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'homey', 'devices', '--token', 'abc'], homeyHome);

    assertFailure(result, 'homey api homey devices --token abc');
    assert.match(result.stdout, /Missing required option: --address/);
  });

  it('rejects --address without --token', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(
      ['api', 'homey', 'devices', '--address', 'http://127.0.0.1'],
      homeyHome,
    );

    assertFailure(result, 'homey api homey devices --address http://127.0.0.1');
    assert.match(result.stdout, /--address can only be used together with --token/);
  });

  it('rejects non-positive timeout values', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'homey', 'devices', '--timeout', '0'], homeyHome);

    assertFailure(result, 'homey api homey devices --timeout 0');
    assert.match(result.stdout, /Invalid timeout/);
  });

  it('enforces required operation flags from specification', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'homey', 'devices', 'get-device'], homeyHome);

    assertFailure(result, 'homey api homey devices get-device');
    assert.match(result.stderr, /Missing required argument: id/);
  });

  it('supports --jq filtering in token mode for default get-devices output', async (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const serverScript = `
      const http = require('node:http');
      const payload = {
        "device-b": { "id": "device-b" },
        "device-a": { "id": "device-a" }
      };

      const server = http.createServer((req, res) => {
        req.resume();
        req.on('end', () => {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(payload));
        });
      });

      server.listen(0, '127.0.0.1', () => {
        const address = server.address();
        process.stdout.write(String(address.port));
      });

      process.on('SIGTERM', () => {
        server.close(() => process.exit(0));
      });
    `;
    const serverProcess = spawn(process.execPath, ['-e', serverScript], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    t.after(() => {
      serverProcess.kill('SIGTERM');
    });

    const port = await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Timed out while waiting for test server to start.'));
      }, 5000);

      serverProcess.stdout.once('data', (chunk) => {
        clearTimeout(timeout);
        const parsedPort = Number.parseInt(String(chunk), 10);

        if (!Number.isFinite(parsedPort)) {
          reject(new Error(`Invalid server port output: ${String(chunk)}`));
          return;
        }

        resolve(parsedPort);
      });

      serverProcess.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });

      serverProcess.once('exit', (code) => {
        clearTimeout(timeout);
        reject(new Error(`Test server exited unexpectedly with code ${code}.`));
      });
    });

    const result = runHomey(
      [
        'api',
        'homey',
        'devices',
        '--token',
        'abc',
        '--address',
        `http://127.0.0.1:${port}`,
        '--jq',
        'keys',
      ],
      homeyHome,
    );

    assertSuccess(result, 'homey api homey devices --token abc --address <mock> --jq keys');
    assert.doesNotThrow(() => JSON.parse(result.stdout));
    assert.deepStrictEqual(JSON.parse(result.stdout), ['device-a', 'device-b']);
  });
});
