import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import App from '../../lib/App.js';
import NpmCommands from '../../lib/NpmCommands.js';
import { copyFixtureApp, listTree } from './helpers.mjs';

describe('app build configuration', () => {
  for (const typescript of [undefined, '^5.0.0']) {
    for (const build of [undefined, false, true]) {
      it(`resolves build=${build} with typescript=${typescript}`, async (t) => {
        const appPath = await copyFixtureApp(t, 'node-basic');
        await fs.writeFile(
          path.join(appPath, 'package.json'),
          JSON.stringify({
            homey: { build },
            devDependencies: { typescript },
            scripts: { build: 'node build.cjs' },
          }),
        );
        let expected = 'none';
        if (build === true) {
          expected = 'script';
        } else if (build === undefined && typescript) {
          expected = 'typescript';
        }

        assert.strictEqual(App.getBuildMode({ appPath }), expected);
      });
    }
  }

  for (const contents of [undefined, '{', 'null', '{}']) {
    it(`retains no-build handling for package contents ${contents}`, async (t) => {
      const appPath = await copyFixtureApp(t, 'node-basic');
      if (contents !== undefined) {
        await fs.writeFile(path.join(appPath, 'package.json'), contents);
      }

      assert.strictEqual(App.getBuildMode({ appPath }), 'none');
    });
  }

  for (const build of ['false', 'true', 0, 1, null, {}, []]) {
    it(`rejects invalid build setting ${JSON.stringify(build)} before modifying the app`, async (t) => {
      const appPath = await copyFixtureApp(t, 'node-compose-esm');
      const manifestPath = path.join(appPath, 'app.json');
      await fs.writeFile(manifestPath, 'previous manifest');
      await fs.mkdir(path.join(appPath, '.homeybuild'));
      const sentinelPath = path.join(appPath, '.homeybuild', 'previous.txt');
      await fs.writeFile(sentinelPath, 'previous build');
      await fs.writeFile(path.join(appPath, 'package.json'), JSON.stringify({ homey: { build } }));

      await assert.rejects(new App(appPath).preprocess(), /homey\.build.*boolean/);
      assert.strictEqual(await fs.readFile(manifestPath, 'utf8'), 'previous manifest');
      assert.strictEqual(await fs.readFile(sentinelPath, 'utf8'), 'previous build');
    });
  }

  for (const buildScript of [undefined, '', '  \n', false, 42]) {
    it(`requires a nonempty script when explicitly enabled: ${JSON.stringify(buildScript)}`, async (t) => {
      const appPath = await copyFixtureApp(t, 'node-basic');
      await fs.writeFile(
        path.join(appPath, 'package.json'),
        JSON.stringify({ homey: { build: true }, scripts: { build: buildScript } }),
      );

      await assert.rejects(new App(appPath).preprocess(), /requires a nonempty `scripts\.build`/);
      await assert.rejects(fs.access(path.join(appPath, '.homeybuild')), { code: 'ENOENT' });
    });
  }

  it('runs a tool-independent build in the app directory and preserves staged files', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    await fs.writeFile(
      path.join(appPath, 'package.json'),
      JSON.stringify({ homey: { build: true }, scripts: { build: 'node build.cjs' } }),
    );
    await fs.writeFile(
      path.join(appPath, 'build.cjs'),
      `
const fs = require('node:fs');
for (const file of ['app.json', 'assets/icon.svg', 'node_modules/fixture/value.txt']) {
  fs.accessSync('.homeybuild/' + file);
}
fs.writeFileSync('.homeybuild/generated.txt', process.cwd());
fs.writeFileSync('.homeybuild/app.js', '// generated application');
`,
    );
    await fs.mkdir(path.join(appPath, 'node_modules', 'fixture'), { recursive: true });
    await fs.writeFile(
      path.join(appPath, 'node_modules', 'fixture', 'value.txt'),
      'production dependency',
    );
    t.mock.method(NpmCommands, 'getProductionDependencies', async () => {
      return ['node_modules/fixture'];
    });
    t.mock.method(App, 'transpileToTypescript', async () => {
      assert.fail('Explicit builds must not invoke TypeScript configuration checks');
    });

    await new App(appPath).build();

    assert.strictEqual(
      await fs.readFile(path.join(appPath, '.homeybuild/generated.txt'), 'utf8'),
      appPath,
    );
    assert.strictEqual(
      await fs.readFile(path.join(appPath, '.homeybuild/app.js'), 'utf8'),
      '// generated application',
    );
    assert.strictEqual(
      await fs.readFile(path.join(appPath, '.homeybuild/node_modules/fixture/value.txt'), 'utf8'),
      'production dependency',
    );
    await assert.rejects(fs.access(path.join(appPath, 'tsconfig.json')), { code: 'ENOENT' });
  });

  it('keeps Compose, dependency copying, postprocessing, and validation when opted out', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-compose-esm');
    await fs.writeFile(
      path.join(appPath, 'package.json'),
      JSON.stringify({
        type: 'module',
        homey: { build: false },
        devDependencies: { typescript: '*' },
        scripts: { build: 'node missing-build-script.cjs' },
      }),
    );
    await fs.writeFile(path.join(appPath, 'app.json'), '{}');
    await fs.mkdir(path.join(appPath, 'node_modules', 'fixture'), { recursive: true });
    await fs.writeFile(path.join(appPath, 'node_modules', 'fixture', 'value.txt'), 'dependency');
    t.mock.method(NpmCommands, 'getProductionDependencies', async () => {
      return ['node_modules/fixture'];
    });
    t.mock.method(App, 'transpileToTypescript', async () => {
      assert.fail('Opted-out apps must not compile');
    });
    const app = new App(appPath);

    await app.build();

    const buildPath = path.join(appPath, '.homeybuild');
    const manifest = JSON.parse(await fs.readFile(path.join(buildPath, 'app.json'), 'utf8'));
    const pkg = JSON.parse(await fs.readFile(path.join(buildPath, 'package.json'), 'utf8'));
    assert.strictEqual(manifest.drivers[0].id, 'fixture');
    assert.strictEqual(pkg.type, 'module');
    const tree = await listTree(buildPath);
    assert.ok(tree.includes('app.js'));
    assert.ok(tree.includes('node_modules/fixture/value.txt'));
    await fs.rm(path.join(buildPath, 'assets/icon.svg'));
    await assert.rejects(app.validate(), /assets.*icon\.svg/);
  });

  it('retains build diagnostics and stops before postprocessing on script failure', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    await fs.writeFile(path.join(appPath, '.gitignore'), '/node_modules/');
    await fs.writeFile(
      path.join(appPath, 'package.json'),
      JSON.stringify({ homey: { build: true }, scripts: { build: 'node build.cjs' } }),
    );
    await fs.writeFile(
      path.join(appPath, 'build.cjs'),
      "console.log('build stdout'); console.error('build stderr'); process.exit(7);\n",
    );

    await assert.rejects(
      new App(appPath).preprocess({ copyAppProductionDependencies: false }),
      (error) => {
        assert.strictEqual(error.message, 'App build failed.');
        assert.strictEqual(error.cause.code, 7);
        assert.match(error.cause.stdout, /build stdout/);
        assert.match(error.cause.stderr, /build stderr/);
        return true;
      },
    );
    assert.strictEqual(
      await fs.readFile(path.join(appPath, '.gitignore'), 'utf8'),
      '/node_modules/',
    );
  });

  it('retains legacy TypeScript configuration checks in the app directory', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const previousOffline = process.env.npm_config_offline;
    process.env.npm_config_offline = 'true';
    t.after(() => {
      if (previousOffline === undefined) {
        delete process.env.npm_config_offline;
      } else {
        process.env.npm_config_offline = previousOffline;
      }
    });
    await fs.writeFile(
      path.join(appPath, 'package.json'),
      JSON.stringify({
        devDependencies: { typescript: '*' },
        scripts: { build: 'node build.cjs' },
      }),
    );
    await fs.writeFile(
      path.join(appPath, 'build.cjs'),
      "require('node:fs').writeFileSync('.homeybuild/compiled.txt', process.cwd());\n",
    );
    await fs.mkdir(path.join(appPath, 'node_modules/.bin'), { recursive: true });
    await fs.writeFile(
      path.join(appPath, 'node_modules/.bin/tsc'),
      `#!/usr/bin/env node
const fs = require('node:fs');
fs.writeFileSync('config-cwd.txt', process.cwd());
process.stdout.write(fs.readFileSync('tsconfig.json', 'utf8'));
`,
      { mode: 0o755 },
    );
    await fs.writeFile(
      path.join(appPath, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { outDir: './.homeybuild' } }),
    );
    const app = new App(appPath);

    await app.preprocess({ copyAppProductionDependencies: false });

    assert.strictEqual(await fs.readFile(path.join(appPath, 'config-cwd.txt'), 'utf8'), appPath);
    assert.strictEqual(
      await fs.readFile(path.join(appPath, '.homeybuild/compiled.txt'), 'utf8'),
      appPath,
    );
    await fs.writeFile(
      path.join(appPath, 'tsconfig.json'),
      JSON.stringify({ compilerOptions: { outDir: './dist' } }),
    );
    await assert.rejects(
      app.preprocess({ copyAppProductionDependencies: false }),
      /Typescript compilation failed/,
    );
    await assert.rejects(fs.access(path.join(appPath, '.homeybuild/compiled.txt')), {
      code: 'ENOENT',
    });
  });
});
