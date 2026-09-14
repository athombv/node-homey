import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import App from '../../lib/App.js';
import { copyFixtureApp } from './helpers.mjs';

const templatePath = fileURLToPath(new URL('../../assets/templates/app/drivers/', import.meta.url));

describe('driver template source language', () => {
  const cases = [
    { name: 'JSDoc JavaScript', files: ['app.js'], typescript: '*', expected: '.js' },
    { name: 'TypeScript without a compiler dependency', files: ['app.ts'], expected: '.ts' },
    {
      name: 'mixed sources with a compiler dependency',
      files: ['app.ts', 'app.js'],
      typescript: '*',
      expected: '.ts',
    },
    {
      name: 'mixed sources without a compiler dependency',
      files: ['app.ts', 'app.js'],
      expected: '.js',
    },
    {
      name: 'absent sources with a compiler dependency',
      files: [],
      typescript: '*',
      expected: '.ts',
    },
    { name: 'absent sources without a compiler dependency', files: [], expected: '.js' },
    {
      name: 'JavaScript main takes precedence',
      files: ['src/start.cjs', 'app.ts'],
      main: 'src/start.cjs',
      typescript: '*',
      expected: '.js',
    },
    {
      name: 'TypeScript main takes precedence',
      files: ['src/start.mts', 'app.js'],
      main: 'src/start.mts',
      expected: '.ts',
    },
    {
      name: 'missing main falls back to source',
      files: ['app.ts'],
      main: 'missing.js',
      expected: '.ts',
    },
    {
      name: 'unrecognized main falls back to source',
      files: ['start.txt', 'app.ts'],
      main: 'start.txt',
      expected: '.ts',
    },
    {
      name: 'build output main is ignored',
      files: ['.homeybuild/app.js', 'app.ts'],
      main: './.homeybuild/app.js',
      expected: '.ts',
    },
    {
      name: 'normalized build output main is ignored',
      files: ['.homeybuild/app.js', 'app.ts'],
      main: 'src/../.homeybuild/app.js',
      expected: '.ts',
    },
    {
      name: 'similarly named source directory is allowed',
      files: ['.homeybuild-source/start.ts', 'app.js'],
      main: '.homeybuild-source/start.ts',
      expected: '.ts',
    },
    {
      name: 'multiple files of one language',
      files: ['app.js', 'app.cjs'],
      typescript: '*',
      expected: '.js',
    },
  ];

  for (const extension of ['js', 'mjs', 'cjs', 'ts', 'mts', 'cts']) {
    const expected = extension.includes('ts') ? '.ts' : '.js';
    cases.push({ name: `root app.${extension}`, files: [`app.${extension}`], expected });
    cases.push({
      name: `main with .${extension}`,
      files: [`src/start.${extension}`],
      main: `src/start.${extension}`,
      expected,
    });
  }

  for (const scenario of cases) {
    for (const build of [false, true]) {
      it(`${scenario.name}, build=${build}`, async (t) => {
        const appPath = await copyFixtureApp(t, 'node-basic');
        await fs.rm(path.join(appPath, 'app.js'));
        for (const file of scenario.files) {
          const filePath = path.join(appPath, file);
          await fs.mkdir(path.dirname(filePath), { recursive: true });
          await fs.writeFile(filePath, '// source');
        }
        await fs.writeFile(
          path.join(appPath, 'package.json'),
          JSON.stringify({
            main: scenario.main,
            homey: { build },
            devDependencies: { typescript: scenario.typescript },
          }),
        );
        const driverPath = path.join(appPath, 'drivers/new');
        await fs.mkdir(driverPath, { recursive: true });

        await new App(appPath).copyDriverAndDeviceTemplate(templatePath, driverPath);

        assert.deepStrictEqual((await fs.readdir(driverPath)).sort(), [
          `device${scenario.expected}`,
          `driver${scenario.expected}`,
        ]);
        for (const name of ['driver', 'device']) {
          assert.strictEqual(
            await fs.readFile(path.join(driverPath, `${name}${scenario.expected}`), 'utf8'),
            await fs.readFile(path.join(templatePath, `${name}${scenario.expected}`), 'utf8'),
          );
        }
      });
    }
  }

  it('uses source files when package.json is malformed', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    await fs.rename(path.join(appPath, 'app.js'), path.join(appPath, 'app.ts'));
    await fs.writeFile(path.join(appPath, 'package.json'), '{');

    assert.strictEqual(App.usesTypeScriptSource({ appPath }), true);
  });

  it('ignores directories named as entry files', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    await fs.mkdir(path.join(appPath, 'app.ts'));
    await fs.writeFile(
      path.join(appPath, 'package.json'),
      JSON.stringify({ main: 'app.ts', devDependencies: { typescript: '*' } }),
    );

    assert.strictEqual(App.usesTypeScriptSource({ appPath }), false);
  });

  for (const build of [undefined, false, true]) {
    it(`preserves ESM templates with TypeScript source and build=${build}`, async (t) => {
      const appPath = await copyFixtureApp(t, 'node-basic');
      await fs.rename(path.join(appPath, 'app.js'), path.join(appPath, 'app.ts'));
      await fs.writeFile(
        path.join(appPath, 'package.json'),
        JSON.stringify({ type: 'module', homey: { build }, devDependencies: { typescript: '*' } }),
      );
      const driverPath = path.join(appPath, 'drivers/new');
      await fs.mkdir(driverPath, { recursive: true });

      await new App(appPath).copyDriverAndDeviceTemplate(templatePath, driverPath);

      for (const name of ['driver', 'device']) {
        assert.strictEqual(
          await fs.readFile(path.join(driverPath, `${name}.js`), 'utf8'),
          await fs.readFile(path.join(templatePath, `${name}.mjs`), 'utf8'),
        );
      }
      assert.deepStrictEqual((await fs.readdir(driverPath)).sort(), ['device.js', 'driver.js']);
    });
  }
});
