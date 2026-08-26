import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import AppPython from '../../lib/AppPython.js';
import { copyFixtureApp } from './helpers.mjs';
import { createFakeHomey } from './fakes.mjs';

describe('Python lifecycle characterization', () => {
  it('regenerates pyproject.toml from the app manifest', async (t) => {
    const appPath = await copyFixtureApp(t, 'python-basic');
    const manifestPath = path.join(appPath, 'app.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    const app = new AppPython(appPath);

    manifest.pythonPackages = ['requests==2.32.0', 'pydantic>=2'];
    await fs.writeFile(manifestPath, JSON.stringify(manifest));

    const pyprojectPath = path.join(appPath, 'pyproject.toml');
    await app.syncPyproject(pyprojectPath);

    const pyproject = await fs.readFile(pyprojectPath, 'utf8');
    assert.match(pyproject, /name = "com\.test\.python-basic"/);
    assert.match(pyproject, /version = "1\.0\.0"/);
    assert.match(pyproject, /"requests==2\.32\.0"/);
    assert.match(pyproject, /"pydantic>=2"/);
  });

  it('writes the manifest Python version only when it changes', async (t) => {
    const appPath = await copyFixtureApp(t, 'python-basic');
    const app = new AppPython(appPath);
    const versionPath = path.join(appPath, 'python_packages', '.python-version');

    await app.syncPythonVersion(versionPath);
    const firstStat = await fs.stat(versionPath);
    await app.syncPythonVersion(versionPath);
    const secondStat = await fs.stat(versionPath);

    assert.strictEqual(await fs.readFile(versionPath, 'utf8'), '3.14');
    assert.strictEqual(secondStat.mtimeMs, firstStat.mtimeMs);
  });

  it('rebuilds missing dependency caches before collecting production dependencies', async (t) => {
    const appPath = await copyFixtureApp(t, 'python-basic');
    const manifestPath = path.join(appPath, 'app.json');
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    const app = new AppPython(appPath);
    const installCalls = [];
    const collectCalls = [];

    manifest.pythonPackages = ['requests==2.32.0'];
    await fs.writeFile(manifestPath, JSON.stringify(manifest));
    t.mock.method(app, 'installDependencies', async (options) => {
      installCalls.push(options);
    });
    t.mock.method(app, 'collectProductionDependencies', async (platforms) => {
      collectCalls.push(platforms);
    });

    await app.preprocess({
      platforms: ['arm64'],
      dockerSocketPath: '/tmp/docker.sock',
      findLinks: '/fixture/wheels',
    });

    assert.deepStrictEqual(installCalls, [
      { findLinks: '/fixture/wheels', dockerSocketPath: '/tmp/docker.sock' },
    ]);
    assert.deepStrictEqual(collectCalls, [['arm64']]);
  });

  it('forwards Python build options during install and packs the build directory', async (t) => {
    const appPath = await copyFixtureApp(t, 'python-basic');
    const app = new AppPython(appPath);
    const { calls, homey } = createFakeHomey();
    const archive = { kind: 'python-archive' };
    const preprocessCalls = [];
    const packCalls = [];

    t.mock.method(app, 'preprocess', async (options) => {
      preprocessCalls.push(options);
    });
    t.mock.method(app, '_validate', async () => {
      return true;
    });
    t.mock.method(app, '_getPackStream', async (options) => {
      packCalls.push(options);
      return archive;
    });
    t.mock.method(app, '_getEnv', async () => {
      return { PYTHON_ENV: 'fixture' };
    });

    const result = await app.install({
      homey,
      clean: true,
      skipBuild: true,
      debug: true,
      dockerSocketPath: '/tmp/docker.sock',
      findLinks: '/fixture/wheels',
    });

    assert.deepStrictEqual(preprocessCalls, [
      { findLinks: '/fixture/wheels', dockerSocketPath: '/tmp/docker.sock' },
    ]);
    assert.deepStrictEqual(packCalls, [{ appPath: app._homeyBuildPath }]);
    assert.deepStrictEqual(calls.runApp, [
      {
        app: archive,
        env: { PYTHON_ENV: 'fixture' },
        debug: true,
        clean: true,
      },
    ]);
    assert.strictEqual(result.appId, 'com.test.app');
  });

  it('reports a missing cross-compiled virtual environment', async (t) => {
    const appPath = await copyFixtureApp(t, 'python-basic');
    const app = new AppPython(appPath);

    await assert.rejects(() => {
      return app.collectProductionDependencies(['arm64']);
    }, /Error while collecting cross-compiled virtual environment for arm64/);
  });
});
