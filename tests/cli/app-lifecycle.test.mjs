import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import { copyFixtureApp } from '../app/helpers.mjs';
import { assertSuccess, createIsolatedHomeyHome, removeHomeyHome, runHomey } from './helpers.mjs';

describe('CLI app lifecycle fixtures', () => {
  it('builds a Node.js fixture through the CLI', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => {
      return removeHomeyHome(homeyHome);
    });

    const result = runHomey(['app', 'build', '--path', appPath], homeyHome, { timeout: 30000 });

    assertSuccess(result, `homey app build --path ${appPath}`);
    assert.match(result.stdout, /App built successfully/);
    assert.strictEqual(
      await fs.readFile(path.join(appPath, '.homeybuild', 'app.js'), 'utf8'),
      "'use strict';\n\nmodule.exports = class TestApp {};\n",
    );
  });

  it('validates a Compose ESM fixture through the CLI', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-compose-esm');
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => {
      return removeHomeyHome(homeyHome);
    });

    const result = runHomey(['app', 'validate', '--path', appPath, '--level', 'debug'], homeyHome, {
      timeout: 30000,
    });

    assertSuccess(result, `homey app validate --path ${appPath}`);
    assert.match(result.stdout, /App validated successfully against level `debug`/);

    const manifest = JSON.parse(await fs.readFile(path.join(appPath, 'app.json'), 'utf8'));
    assert.strictEqual(manifest.esm, true);
    assert.strictEqual(manifest.drivers[0].id, 'fixture');
  });

  it('returns a failure exit for an invalid fixture', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => {
      return removeHomeyHome(homeyHome);
    });

    await fs.writeFile(path.join(appPath, 'app.json'), '{');

    const result = runHomey(['app', 'validate', '--path', appPath, '--level', 'debug'], homeyHome, {
      timeout: 30000,
    });

    assert.strictEqual(result.status, 1);
    assert.match(`${result.stdout}\n${result.stderr}`, /Could not find a valid Homey App/);
  });
});
