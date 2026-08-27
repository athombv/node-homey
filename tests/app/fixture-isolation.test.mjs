import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import App from '../../lib/App.js';
import { copyFixtureApp, listTree, snapshotFixtureApp } from './helpers.mjs';

describe('fixture isolation', () => {
  it('preserves checked-in fixture bytes and removes temporary build copies', async (t) => {
    const fixtureName = 'node-compose-esm';
    const fixtureBefore = await snapshotFixtureApp(fixtureName);
    let tempPath;

    await t.test('mutates only an isolated fixture copy', async (childTest) => {
      const appPath = await copyFixtureApp(childTest, fixtureName);
      tempPath = path.dirname(appPath);
      const app = new App(appPath);

      await app.build();

      const copiedInventory = await listTree(appPath);

      assert.ok(copiedInventory.includes('.homeybuild/'));
      assert.ok(copiedInventory.includes('.homeybuild/app.json'));
    });

    const fixtureAfter = await snapshotFixtureApp(fixtureName);

    assert.deepStrictEqual(fixtureAfter, fixtureBefore);
    await assert.rejects(fs.access(tempPath), { code: 'ENOENT' });
  });
});
