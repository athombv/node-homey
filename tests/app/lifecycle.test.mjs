import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import fse from 'fs-extra';

import App from '../../lib/App.js';
import AppPython from '../../lib/AppPython.js';
import { copyFixtureApp, createManifestApp, extractArchive, listTree } from './helpers.mjs';

describe('app build and validation characterization', () => {
  it('preprocesses a Node.js app into an isolated build tree', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);

    await app.preprocess({ copyAppProductionDependencies: false });

    const buildTree = await listTree(path.join(appPath, '.homeybuild'));

    assert.ok(buildTree.includes('app.json'));
    assert.ok(buildTree.includes('app.js'));
    assert.ok(buildTree.includes('assets/icon.svg'));
    assert.ok(buildTree.includes('assets/images/small.png'));
    assert.ok(buildTree.includes('README.txt'));
    assert.ok(!buildTree.includes('env.json'));
    assert.ok(!buildTree.includes('ignored.txt'));
    assert.ok(!buildTree.includes('.homeychangelog.json'));
  });

  it('builds and validates a publish-ready Node.js fixture', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);

    await app.build();
    await app.validate({ level: 'publish' });

    assert.strictEqual(
      (
        await fs.readFile(path.join(appPath, '.homeybuild', 'node_modules', '.gitkeep'), 'utf8')
      ).trim(),
      '',
    );
  });

  it('builds and validates a Python fixture without Docker when it has no dependencies', async (t) => {
    const appPath = await copyFixtureApp(t, 'python-basic');
    const app = new AppPython(appPath);

    await app.build();
    await app.validate({ level: 'publish' });

    const buildTree = await listTree(path.join(appPath, '.homeybuild'));
    assert.ok(buildTree.includes('app.py'));
    assert.ok(
      !buildTree.some((entry) => {
        return entry.startsWith('python_packages/');
      }),
    );
  });

  it('packs only build output and can read the resulting archive', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);

    await app.preprocess({ copyAppProductionDependencies: false });

    const archive = await app._getPackStream();
    const extractPath = await extractArchive(t, archive);
    const archiveTree = await listTree(extractPath);

    assert.ok(archiveTree.includes('app.json'));
    assert.ok(archiveTree.includes('assets/icon.svg'));
    assert.ok(!archiveTree.includes('env.json'));
    assert.ok(!archiveTree.includes('.homeychangelog.json'));
  });

  it('characterizes malformed env.json as an empty environment', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);

    await fs.writeFile(path.join(appPath, 'env.json'), '{');

    assert.deepStrictEqual(await app._getEnv(), {});
  });

  it('rejects invalid compatibility during validation', async (t) => {
    const appPath = await createManifestApp(t, { compatibility: 'not-semver' });
    const app = new App(appPath);

    await app.preprocess({ copyAppProductionDependencies: false });

    await assert.rejects(() => {
      return app.validate();
    }, /Invalid compatibility/);
  });

  it('rejects a missing icon during validation', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);

    await fs.rm(path.join(appPath, 'assets', 'icon.svg'));
    await app.preprocess({ copyAppProductionDependencies: false });

    await assert.rejects(() => {
      return app.validate();
    }, /assets.*icon\.svg/);
  });

  it('rejects a malformed locale during validation', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);

    await fs.writeFile(path.join(appPath, 'locales', 'en.json'), '{');
    await app.preprocess({ copyAppProductionDependencies: false });

    await assert.rejects(() => {
      return app.validate();
    }, /Malformed locale/);
  });

  it('retries clearing the build directory once after ENOTEMPTY', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);
    const originalRemove = fse.remove.bind(fse);
    let attempts = 0;

    t.mock.method(fse, 'remove', async (...args) => {
      attempts += 1;

      if (attempts === 1) {
        const error = new Error('directory not empty');
        error.code = 'ENOTEMPTY';
        throw error;
      }

      return await originalRemove(...args);
    });

    await app.preprocess({ copyAppProductionDependencies: false });

    assert.strictEqual(attempts, 2);
  });

  it('propagates a filesystem error while clearing the build directory', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);
    const error = new Error('permission denied');
    error.code = 'EACCES';

    t.mock.method(fse, 'remove', async () => {
      throw error;
    });

    await assert.rejects(
      () => {
        return app.preprocess({ copyAppProductionDependencies: false });
      },
      (actualError) => {
        return actualError === error;
      },
    );
  });

  it('propagates a source copy failure', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);
    const error = new Error('copy failed');

    t.mock.method(fse, 'copy', async () => {
      throw error;
    });

    await assert.rejects(
      () => {
        return app.preprocess({ copyAppProductionDependencies: false });
      },
      (actualError) => {
        return actualError === error;
      },
    );
  });

  it('rejects packing a missing directory', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);

    await assert.rejects(() => {
      return app._getPackStream({ appPath: path.join(appPath, 'missing') });
    });
  });
});
