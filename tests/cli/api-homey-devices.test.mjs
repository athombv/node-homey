import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { describe, it } from 'node:test';
import { assertSuccess, createIsolatedHomeyHome, removeHomeyHome, runHomey } from './helpers.mjs';
import ApiHomeyTestHelpers from './api-homey-helpers.mjs';

const { assertFailure } = ApiHomeyTestHelpers;

describe('CLI api devices', () => {
  it('shows manager help without requiring an active Homey', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'devices', '--help'], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Devices manager operations/);
    assert.match(result.stdout, /get-devices/);
    assert.match(result.stdout, /open-device/);
    assert.doesNotMatch(result.stdout, /--jq/);
  });

  it('lists available commands when invoked without a subcommand', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'devices'], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /get-devices/);
    assert.match(result.stdout, /open-device/);
  });

  it('provides dynamic completion entries for devices operations', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['--get-yargs-completions', 'api', 'devices', ''], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /^get-devices$/m);
    assert.match(result.stdout, /^open-device$/m);
    assert.match(result.stdout, /^update-device$/m);
  });

  it('shows only relevant help options for open-device', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'devices', 'open-device', '--help'], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Open a device in the Homey web app/);
    assert.match(result.stdout, /--homey-id/);
    assert.match(result.stdout, /--id/);
    assert.doesNotMatch(result.stdout, /--json/);
    assert.doesNotMatch(result.stdout, /--timeout/);
    assert.doesNotMatch(result.stdout, /--token/);
    assert.doesNotMatch(result.stdout, /--address/);
    assert.doesNotMatch(result.stdout, /--jq/);
    assert.doesNotMatch(result.stdout, /--version/);
  });

  it('shows request options only on generated operation help', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'devices', 'get-devices', '--help'], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /--json/);
    assert.match(result.stdout, /--timeout/);
    assert.match(result.stdout, /--token/);
    assert.match(result.stdout, /--address/);
    assert.match(result.stdout, /--homey-id/);
    assert.match(result.stdout, /--jq/);
  });

  it('rejects --json for open-device', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(
      ['api', 'devices', 'open-device', '--id', 'device-1', '--json'],
      homeyHome,
    );

    assertFailure(result, 'homey api devices open-device --id device-1 --json');
    assert.match(result.stderr, /Unknown argument: json/);
  });

  it('rejects token mode flags for open-device', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(
      ['api', 'devices', 'open-device', '--id', 'device-1', '--token', 'abc'],
      homeyHome,
    );

    assertFailure(result, 'homey api devices open-device --id device-1 --token abc');
    assert.match(result.stderr, /Unknown argument: token/);
  });

  it('keeps partial operation tokens for completion filtering', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['--get-yargs-completions', 'api', 'devices', 'get-d'], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /^get-device$/m);
    assert.match(result.stdout, /^get-devices$/m);
  });

  it('fails with guidance when no Homey is selected in normal mode', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'devices', 'get-devices'], homeyHome);

    assertFailure(result, 'homey api devices get-devices');
    assert.match(result.stdout, /No active Homey selected\. Run `homey select` to choose one\./);
  });

  it('returns JSON-formatted errors when --json is provided', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'devices', 'get-devices', '--json'], homeyHome);

    assertFailure(result, 'homey api devices get-devices --json');
    assert.doesNotThrow(() => JSON.parse(result.stdout));
    const payload = JSON.parse(result.stdout);
    assert.match(payload.error, /No active Homey selected/);
  });

  it('requires --address when --token is provided', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'devices', 'get-devices', '--token', 'abc'], homeyHome);

    assertFailure(result, 'homey api devices get-devices --token abc');
    assert.match(result.stdout, /Missing required option: --address or --homey-id/);
  });

  it('rejects using --address and --homey-id together with --token', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(
      [
        'api',
        'devices',
        'get-devices',
        '--token',
        'abc',
        '--address',
        'http://127.0.0.1',
        '--homey-id',
        'homey-1',
      ],
      homeyHome,
    );

    assertFailure(
      result,
      'homey api devices get-devices --token abc --address http://127.0.0.1 --homey-id homey-1',
    );
    assert.match(result.stdout, /--address and --homey-id cannot be used together with --token/);
  });

  it('rejects --address without --token', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(
      ['api', 'devices', 'get-devices', '--address', 'http://127.0.0.1'],
      homeyHome,
    );

    assertFailure(result, 'homey api devices get-devices --address http://127.0.0.1');
    assert.match(result.stdout, /--address can only be used together with --token/);
  });

  it('rejects non-positive timeout values', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'devices', 'get-devices', '--timeout', '0'], homeyHome);

    assertFailure(result, 'homey api devices get-devices --timeout 0');
    assert.match(result.stdout, /Invalid timeout/);
  });

  it('enforces required operation flags from specification', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'devices', 'get-device'], homeyHome);

    assertFailure(result, 'homey api devices get-device');
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
        'devices',
        'get-devices',
        '--token',
        'abc',
        '--address',
        `http://127.0.0.1:${port}`,
        '--jq',
        'keys',
      ],
      homeyHome,
    );

    assertSuccess(result, 'homey api devices get-devices --token abc --address <mock> --jq keys');
    assert.doesNotThrow(() => JSON.parse(result.stdout));
    assert.deepStrictEqual(JSON.parse(result.stdout), ['device-a', 'device-b']);
  });
});
