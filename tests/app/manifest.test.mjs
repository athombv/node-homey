import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import App from '../../lib/App.js';
import AppFactory from '../../lib/AppFactory.js';
import AppPython from '../../lib/AppPython.js';
import { copyFixtureApp, createManifestApp } from './helpers.mjs';

describe('app manifest characterization', () => {
  it('loads the required manifest fields', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const manifest = App.getManifest({ appPath });

    assert.strictEqual(manifest.id, 'com.test.node-basic');
    assert.strictEqual(manifest.version, '1.0.0');
    assert.strictEqual(manifest.compatibility, '>=12.3.0');
    assert.deepStrictEqual(manifest.name, { en: 'Node Basic' });
  });

  it('defaults a manifest without runtime to the Node.js implementation', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');

    assert.ok(AppFactory.getAppInstance(appPath) instanceof App);
  });

  it('selects the Python implementation from the manifest', async (t) => {
    const appPath = await copyFixtureApp(t, 'python-basic');

    assert.ok(AppFactory.getAppInstance(appPath) instanceof AppPython);
  });

  it('rejects an unsupported runtime', async (t) => {
    const appPath = await createManifestApp(t, { runtime: 'ruby' });

    assert.throws(() => {
      return AppFactory.getAppInstance(appPath);
    }, /runtime.*must be one of \[nodejs, python\]/);
  });

  it('rejects a manifest missing a required CLI field', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const manifestPath = path.join(appPath, 'app.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

    delete manifest.compatibility;
    await fs.writeFile(manifestPath, JSON.stringify(manifest));

    assert.throws(() => {
      return App.getManifest({ appPath });
    }, /does not contain the required properties/);
  });

  it('adds path context when the manifest is malformed', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');

    await fs.writeFile(path.join(appPath, 'app.json'), '{');

    assert.throws(
      () => {
        return App.getManifest({ appPath });
      },
      (error) => {
        assert.match(error.message, /Could not find a valid Homey App/);
        assert.match(error.message, /app\.json/);
        return true;
      },
    );
  });

  it('adds path context when app.json is missing', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');

    await fs.rm(path.join(appPath, 'app.json'));

    assert.throws(() => {
      return App.getManifest({ appPath });
    }, /Could not find a valid Homey App/);
  });

  it('detects ESM from package.json and tolerates invalid package JSON', async (t) => {
    const esmPath = await copyFixtureApp(t, 'node-compose-esm');
    const invalidPath = await copyFixtureApp(t, 'node-basic');

    await fs.writeFile(path.join(invalidPath, 'package.json'), '{');

    assert.strictEqual(App.usesModules({ appPath: esmPath }), true);
    assert.strictEqual(App.usesModules({ appPath: invalidPath }), false);
  });
});
