import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { it } from 'node:test';

import App from '../../lib/App.js';
import NpmCommands from '../../lib/NpmCommands.js';
import { copyFixtureApp } from './helpers.mjs';

for (const withPackage of [false, true]) {
  for (const slim of [false, true]) {
    it(`builds with slim=${slim} and package.json=${withPackage}`, async (t) => {
      const appPath = await copyFixtureApp(t, 'node-basic');
      const dependency = path.join(appPath, 'node_modules', 'fixture');
      await fs.mkdir(dependency, { recursive: true });
      const files = ['index.js', 'index.d.ts', 'index.d.mts', 'index.d.cts', 'index.js.map'];
      for (const file of files) {
        await fs.writeFile(path.join(dependency, file), 'fixture');
      }
      await fs.writeFile(path.join(appPath, 'app.js.map'), 'app sourcemap');
      if (withPackage) {
        await fs.writeFile(path.join(appPath, 'package.json'), '{}');
        t.mock.method(NpmCommands, 'getProductionDependencies', async () => [
          'node_modules/fixture',
        ]);
      }

      await new App(appPath).build({ slim });

      const builtDependency = path.join(appPath, '.homeybuild', 'node_modules', 'fixture');
      assert.deepEqual(
        (await fs.readdir(builtDependency)).sort(),
        (slim ? ['index.js'] : files).sort(),
      );
      assert.equal(
        await fs.readFile(path.join(appPath, '.homeybuild', 'app.js.map'), 'utf8'),
        'app sourcemap',
      );
      assert.deepEqual((await fs.readdir(dependency)).sort(), files.sort());
    });
  }
}
