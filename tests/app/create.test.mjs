import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import inquirer from 'inquirer';

import App from '../../lib/App.js';
import NpmCommands from '../../lib/NpmCommands.js';
import AthomApi from '../../services/AthomApi.js';
import { copyFixtureApp } from './helpers.mjs';

describe('new app build configuration', () => {
  for (const language of ['javascript', 'typescript']) {
    it(`sets an explicit build choice for ${language}`, async (t) => {
      const cwd = await copyFixtureApp(t, 'node-basic');
      t.mock.method(inquirer, 'prompt', async () => {
        return { confirm: true, eslint: false, 'github-workflows': false };
      });
      t.mock.method(AthomApi, 'getProfile', async () => {
        return { firstname: 'Test', lastname: 'Author', email: 'test@example.com' };
      });
      const install = t.mock.method(NpmCommands, 'installDev', async () => {});

      await App.create({
        appPath: cwd,
        globalAnswers: {
          id: 'com.test.created',
          appName: 'Created App',
          appDescription: 'An isolated app',
          category: 'tools',
          platforms: ['local'],
          'programming-language': language,
        },
      });

      const appPath = path.join(cwd, 'com.test.created');
      const pkg = JSON.parse(await fs.readFile(path.join(appPath, 'package.json'), 'utf8'));
      const installed = install.mock.calls.flatMap((call) => {
        return call.arguments[0];
      });
      assert.strictEqual(pkg.homey.build, language === 'typescript');
      if (language === 'typescript') {
        assert.strictEqual(pkg.scripts.build, 'tsc');
        assert.ok(installed.includes('typescript'));
        await fs.access(path.join(appPath, 'app.ts'));
        const config = JSON.parse(await fs.readFile(path.join(appPath, 'tsconfig.json'), 'utf8'));
        assert.strictEqual(config.compilerOptions.outDir, '.homeybuild/');
      } else {
        assert.strictEqual(pkg.scripts.build, undefined);
        assert.strictEqual(pkg.main, 'app.js');
        assert.ok(!installed.includes('typescript'));
        await fs.access(path.join(appPath, 'app.js'));
      }
    });
  }
});
