import assert from 'node:assert';
import { spawn } from 'node:child_process';
import { describe, it } from 'node:test';
import { assertSuccess, createIsolatedHomeyHome, removeHomeyHome, runHomey } from './helpers.mjs';
import ApiHomeyTestHelpers from './api-homey-helpers.mjs';

const { assertFailure } = ApiHomeyTestHelpers;

describe('CLI api raw', () => {
  it('shows help without requiring an active Homey', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'raw', '--help'], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Perform a raw Homey API request/);
    assert.match(result.stdout, /--path/);
    assert.match(result.stdout, /--header/);
    assert.match(result.stdout, /--json/);
    assert.match(result.stdout, /--timeout/);
    assert.match(result.stdout, /--token/);
    assert.match(result.stdout, /--address/);
    assert.match(result.stdout, /--homey-id/);
  });

  it('supports the call alias', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'call', '--help'], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Perform a raw Homey API request/);
  });

  it('supports the request alias', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'request', '--help'], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /Perform a raw Homey API request/);
  });

  it('rejects non-absolute paths', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['api', 'raw', '--path', 'api/manager/system'], homeyHome);

    assertFailure(result, 'homey api raw --path api/manager/system');
    assert.match(result.stdout, /Invalid path/);
  });

  it('rejects --body for unsupported methods', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(
      ['api', 'raw', '--path', '/api/manager/system/', '--body', '{"name":"Homey"}'],
      homeyHome,
    );

    assertFailure(result, 'homey api raw --path /api/manager/system/ --body');
    assert.match(result.stdout, /--body is only supported with methods POST, PUT/);
  });

  it('rejects using --address and --homey-id together with --token', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(
      [
        'api',
        'raw',
        '--path',
        '/api/manager/system/',
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
      'homey api raw --path /api/manager/system/ --token abc --address http://127.0.0.1 --homey-id homey-1',
    );
    assert.match(result.stdout, /--address and --homey-id cannot be used together with --token/);
  });

  it('executes a raw request in token mode and supports include/verbose output', async (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const serverScript = `
      const http = require('node:http');
      const server = http.createServer((req, res) => {
        req.resume();
        req.on('end', () => {
          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.setHeader('X-Api-Homey-Test', '1');
          res.end(JSON.stringify({ ok: true }));
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
        'raw',
        '--method',
        'POST',
        '--path',
        '/api/manager/system/',
        '--header',
        'X-Cli-Test: 1',
        '--body',
        '{"name":"Homey"}',
        '--token',
        'abc',
        '--address',
        `http://127.0.0.1:${port}`,
        '--include',
        '--verbose',
      ],
      homeyHome,
    );

    assertSuccess(result, 'homey api raw --method POST --path /api/manager/system/');
    assert.match(result.stdout, /HTTP\/1\.1 200/);
    assert.match(result.stdout, /content-type: application\/json/);
    assert.match(result.stdout, /"ok": true/);
    assert.match(result.stderr, /authMode=token/);
    assert.match(result.stderr, /durationMs=/);
  });
});
