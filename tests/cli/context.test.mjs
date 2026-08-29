import assert from 'node:assert';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
import { describe, it } from 'node:test';

import { assertSuccess, createIsolatedHomeyHome, removeHomeyHome, runHomey } from './helpers.mjs';

function assertFailure(result, command) {
  assert.notStrictEqual(
    result.status,
    0,
    `Expected "${command}" to fail.\nSTDERR:\n${result.stderr}\nSTDOUT:\n${result.stdout}`,
  );
}

describe('CLI contexts', () => {
  it('exposes legacy selection lazily without rewriting settings', (t) => {
    const homeyHome = createIsolatedHomeyHome({
      activeHomey: {
        id: 'legacy-homey',
        name: 'Legacy Homey',
        platform: 'local',
      },
    });
    t.after(() => removeHomeyHome(homeyHome));
    const settingsPath = `${homeyHome}/settings.json`;
    const before = fs.readFileSync(settingsPath, 'utf8');

    const result = runHomey(['context', 'ls', '--json'], homeyHome);

    assertSuccess(result, 'homey context ls --json');
    const contexts = JSON.parse(result.stdout);
    assert.strictEqual(contexts.length, 1);
    assert.strictEqual(contexts[0].name, 'default');
    assert.strictEqual(contexts[0].current, true);
    assert.deepStrictEqual(contexts[0].route.strategies, [
      'localSecure',
      'local',
      'remoteForwarded',
      'cloud',
    ]);
    assert.strictEqual(fs.readFileSync(settingsPath, 'utf8'), before);
  });

  it('creates contexts without activating them and keeps select current compatible', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const createResult = runHomey(
      [
        'context',
        'create',
        'lab',
        '--homey-id',
        'homey-1',
        '--homey-name',
        'Lab Homey',
        '--platform',
        'local',
        '--auth-profile',
        'work',
        '--json',
      ],
      homeyHome,
    );

    assertSuccess(createResult, 'homey context create lab');
    assert.strictEqual(JSON.parse(createResult.stdout).current, false);

    const useResult = runHomey(['context', 'use', 'lab', '--json'], homeyHome);
    assertSuccess(useResult, 'homey context use lab');

    const currentResult = runHomey(['select', 'current', '--json'], homeyHome);
    assertSuccess(currentResult, 'homey select current --json');
    assert.deepStrictEqual(JSON.parse(currentResult.stdout), {
      id: 'homey-1',
      name: 'Lab Homey',
      platform: 'local',
    });
  });

  it('uses explicit, environment, then persisted context selectors without fallthrough', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    for (const name of ['first', 'second']) {
      const result = runHomey(
        ['context', 'create', name, '--homey-id', `homey-${name}`, '--auth-profile', 'work'],
        homeyHome,
      );
      assertSuccess(result, `homey context create ${name}`);
    }

    assertSuccess(runHomey(['context', 'use', 'first'], homeyHome), 'homey context use first');

    const environmentResult = runHomey(['context', 'show', '--json'], homeyHome, {
      env: { HOMEY_CONTEXT: 'second' },
    });
    assert.deepStrictEqual(JSON.parse(environmentResult.stdout), {
      name: 'second',
      source: 'environment',
    });

    const explicitResult = runHomey(
      ['context', 'show', '--context', 'first', '--json'],
      homeyHome,
      { env: { HOMEY_CONTEXT: 'second' } },
    );
    assert.deepStrictEqual(JSON.parse(explicitResult.stdout), {
      name: 'first',
      source: 'argument',
    });

    const brokenResult = runHomey(['context', 'show'], homeyHome, {
      env: { HOMEY_CONTEXT: 'missing' },
    });
    assertFailure(brokenResult, 'HOMEY_CONTEXT=missing homey context show');
    assert.match(brokenResult.stderr, /Selected context "missing" from environment does not exist/);
  });

  it('redacts stored direct credentials and never includes USB in the default route', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const createResult = runHomey(
      [
        'context',
        'create',
        'direct',
        '--address',
        'http://127.0.0.1:1234',
        '--token-stdin',
        '--use',
        '--json',
      ],
      homeyHome,
      { input: 'super-secret-token\n' },
    );

    assertSuccess(createResult, 'homey context create direct --token-stdin');
    assert.doesNotMatch(createResult.stdout, /super-secret-token/);
    assert.strictEqual(
      JSON.parse(createResult.stdout).homeyAuthentication.credentialId,
      '[REDACTED]',
    );

    const currentResult = runHomey(['select', 'current', '--json'], homeyHome);
    assertSuccess(currentResult, 'homey select current --json');
    assert.deepStrictEqual(JSON.parse(currentResult.stdout), {
      id: null,
      name: null,
      platform: null,
    });

    const inspectResult = runHomey(['context', 'inspect', 'direct', '--json'], homeyHome);
    assertSuccess(inspectResult, 'homey context inspect direct --json');
    assert.doesNotMatch(inspectResult.stdout, /super-secret-token/);

    const settings = JSON.parse(fs.readFileSync(`${homeyHome}/settings.json`, 'utf8'));
    const credentialEntries = Object.values(settings.credentials.entries);
    assert.strictEqual(credentialEntries[0].value, 'super-secret-token');

    const defaultResult = runHomey(
      ['context', 'create', 'default-route', '--homey-id', 'homey-1', '--auth-profile', 'work'],
      homeyHome,
    );
    assertSuccess(defaultResult, 'homey context create default-route');
    const defaultContext = JSON.parse(
      runHomey(['context', 'inspect', 'default-route', '--json'], homeyHome).stdout,
    );
    assert.ok(!defaultContext.route.strategies.includes('usb'));
    assert.ok(!defaultContext.route.strategies.includes('mdns'));
  });

  it('keeps a broken current reference after confirmed removal', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    assertSuccess(
      runHomey(
        ['context', 'create', 'lab', '--homey-id', 'homey-1', '--auth-profile', 'work', '--use'],
        homeyHome,
      ),
      'homey context create lab --use',
    );

    const unconfirmed = runHomey(['context', 'rm', 'lab'], homeyHome);
    assertFailure(unconfirmed, 'homey context rm lab');
    assert.match(unconfirmed.stderr, /re-run with --yes/i);

    assertSuccess(runHomey(['context', 'rm', 'lab', '--yes'], homeyHome), 'context rm --yes');
    const settings = JSON.parse(fs.readFileSync(`${homeyHome}/settings.json`, 'utf8'));
    assert.strictEqual(settings.contextState.current, 'lab');
    assert.strictEqual(settings.activeHomey, null);

    const showResult = runHomey(['context', 'show'], homeyHome);
    assertFailure(showResult, 'homey context show');
    assert.match(showResult.stderr, /Selected context "lab" from current does not exist/);
  });

  it('keeps structured management errors on stderr', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['context', 'inspect', 'missing', '--json'], homeyHome);

    assertFailure(result, 'homey context inspect missing --json');
    assert.strictEqual(result.stdout, '');
    assert.match(JSON.parse(result.stderr).error, /Context does not exist: missing/);
  });

  it('does not persist other patches when token input validation fails', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const createResult = runHomey(
      [
        'context',
        'create',
        'lab',
        '--description',
        'before',
        '--homey-id',
        'homey-1',
        '--auth-profile',
        'work',
      ],
      homeyHome,
    );
    assertSuccess(createResult, 'homey context create lab');

    const updateResult = runHomey(
      ['context', 'update', 'lab', '--description', 'after', '--token-stdin'],
      homeyHome,
      { input: '' },
    );
    assertFailure(updateResult, 'homey context update lab --token-stdin');
    assert.match(updateResult.stderr, /No Homey token was provided/);

    const context = JSON.parse(runHomey(['context', 'inspect', 'lab', '--json'], homeyHome).stdout);
    assert.strictEqual(context.description, 'before');
  });

  it('uses a direct environment-backed context for API commands', async (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));
    const serverScript = `
      const http = require('node:http');
      const server = http.createServer((req, res) => {
        req.resume();
        req.on('end', () => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ id: 'context-homey', name: 'Context Homey' }));
        });
      });
      server.listen(0, '127.0.0.1', () => process.stdout.write(String(server.address().port)));
      process.on('SIGTERM', () => server.close(() => process.exit(0)));
    `;
    const serverProcess = spawn(process.execPath, ['-e', serverScript], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    t.after(() => serverProcess.kill('SIGTERM'));
    const port = await new Promise((resolve, reject) => {
      serverProcess.stdout.once('data', (chunk) => {
        resolve(Number.parseInt(String(chunk), 10));
      });
      serverProcess.once('error', reject);
    });
    const env = { HOMEY_TOKEN_LAB: 'context-token' };

    const createResult = runHomey(
      [
        'context',
        'create',
        'direct',
        '--address',
        `http://127.0.0.1:${port}`,
        '--token-env',
        'HOMEY_TOKEN_LAB',
        '--use',
      ],
      homeyHome,
      { env },
    );
    assertSuccess(createResult, 'homey context create direct --token-env');

    const diagnoseResult = runHomey(['context', 'diagnose', 'direct', '--json'], homeyHome, {
      env,
      timeout: 2000,
    });
    assertSuccess(diagnoseResult, 'homey context diagnose direct --json');
    assert.strictEqual(JSON.parse(diagnoseResult.stdout).authentication, 'homey');

    const apiResult = runHomey(['api', 'system', 'get-info', '--json'], homeyHome, {
      env,
      timeout: 2000,
    });
    assertSuccess(apiResult, 'homey api system get-info --json');
    assert.strictEqual(JSON.parse(apiResult.stdout).name, 'Context Homey');

    const accountResult = runHomey(['api', 'system', 'get-info', '--auth', 'account'], homeyHome, {
      env,
    });
    assertFailure(accountResult, 'homey api system get-info --auth account');
    assert.match(accountResult.stdout, /no account authentication profile/i);
  });
});
