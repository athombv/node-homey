import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import { AthomAppsAPI } from 'homey-api';
import inquirer from 'inquirer';

import App from '../../lib/App.js';
import AthomApi from '../../services/AthomApi.js';
import { copyFixtureApp } from './helpers.mjs';

function setHeadless(t, value) {
  const originalValue = process.env.HOMEY_HEADLESS;

  if (value === undefined) {
    delete process.env.HOMEY_HEADLESS;
  } else {
    process.env.HOMEY_HEADLESS = value;
  }

  t.after(() => {
    if (originalValue === undefined) {
      delete process.env.HOMEY_HEADLESS;
    } else {
      process.env.HOMEY_HEADLESS = originalValue;
    }
  });
}

function mockPublishApi(t, options = {}) {
  const apiCalls = [];
  const tokenCalls = [];

  t.mock.method(AthomApi, 'getProfile', async () => {
    return { roleIds: options.roleIds ?? [] };
  });
  t.mock.method(AthomApi, 'createDelegationToken', async (tokenOptions) => {
    tokenCalls.push(tokenOptions);
    return 'delegation-token';
  });
  t.mock.method(AthomAppsAPI.prototype, 'call', async (request) => {
    apiCalls.push(request);
    return {
      url: 'https://upload.example.test/build',
      method: 'PUT',
      headers: { Authorization: 'fixture-upload' },
      buildId: 'build-1',
    };
  });

  return { apiCalls, tokenCalls };
}

describe('app publish characterization', () => {
  it('builds the App Store payload and uploads the generated archive in headless mode', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);
    const { apiCalls, tokenCalls } = mockPublishApi(t);
    const validateLevels = [];
    const uploadCalls = [];
    const originalValidate = app._validate.bind(app);

    setHeadless(t, '1');
    t.mock.method(app, '_validate', async (options) => {
      validateLevels.push(options.level);
      return await originalValidate(options);
    });
    t.mock.method(app, '_uploadBuildArchive', async (options) => {
      uploadCalls.push(options);
      for await (const chunk of options.archiveStream) {
        assert.ok(Buffer.isBuffer(chunk));
      }
    });

    await app.publish();

    assert.deepStrictEqual(validateLevels, ['publish']);
    assert.deepStrictEqual(tokenCalls, [{ audience: 'apps' }]);
    assert.strictEqual(apiCalls.length, 1);
    assert.strictEqual(apiCalls[0].headers.Authorization, 'Bearer delegation-token');
    assert.strictEqual(apiCalls[0].path, '/app/com.test.node-basic/build');
    assert.strictEqual(apiCalls[0].body.version, '1.0.0');
    assert.deepStrictEqual(apiCalls[0].body.changelog, { en: 'Initial fixture release.' });
    assert.deepStrictEqual(apiCalls[0].body.readme, {
      en: 'A minimal Node.js fixture app.\n',
    });
    assert.deepStrictEqual(apiCalls[0].body.env, {
      FIXTURE_SECRET: 'not-a-real-secret',
    });
    assert.strictEqual(uploadCalls.length, 1);
    assert.strictEqual(uploadCalls[0].url, 'https://upload.example.test/build');
    assert.strictEqual(uploadCalls[0].method, 'PUT');
    assert.ok(uploadCalls[0].size > 0);
  });

  it('uses verified validation for trusted app developers', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);
    const levels = [];

    setHeadless(t, '1');
    mockPublishApi(t, { roleIds: ['app_developer_trusted'] });
    t.mock.method(app, '_validate', async ({ level }) => {
      levels.push(level);
      return true;
    });
    t.mock.method(app, '_getPackStream', async () => {
      return { path: path.join(appPath, 'app.json') };
    });
    t.mock.method(app, '_uploadBuildArchive', async () => {});

    await app.publish();

    assert.deepStrictEqual(levels, ['verified']);
  });

  it('rejects a missing changelog in headless mode', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);

    setHeadless(t, '1');
    mockPublishApi(t);
    await fs.writeFile(path.join(appPath, '.homeychangelog.json'), '{}');

    await assert.rejects(() => {
      return app.publish();
    }, /Missing changelog for v1\.0\.0/);
  });

  it('rejects a missing README before creating a build', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);
    const { apiCalls } = mockPublishApi(t);

    setHeadless(t, '1');
    await fs.rm(path.join(appPath, 'README.txt'));

    await assert.rejects(() => {
      return app.publish();
    }, /Missing file `\/README\.txt`/);
    assert.strictEqual(apiCalls.length, 0);
  });

  it('restores an interactive version bump when validation fails', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);
    const validationError = new Error('validation failed');

    setHeadless(t, undefined);
    mockPublishApi(t);
    t.mock.method(inquirer, 'prompt', async (questions) => {
      const name = questions[0].name;

      if (name === 'hasReadGuidelines') {
        return { hasReadGuidelines: true };
      }

      if (name === 'value') {
        return { value: true };
      }

      if (name === 'version') {
        return { version: 'patch' };
      }

      throw new Error(`Unexpected prompt: ${name}`);
    });
    t.mock.method(app, '_validate', async () => {
      throw validationError;
    });

    await assert.rejects(
      () => {
        return app.publish();
      },
      (error) => {
        return error === validationError;
      },
    );

    const manifest = JSON.parse(await fs.readFile(path.join(appPath, 'app.json'), 'utf8'));
    assert.strictEqual(manifest.version, '1.0.0');
  });

  it('characterizes an upload failure after validation as retaining the version bump', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);
    const uploadError = new Error('upload failed');

    setHeadless(t, undefined);
    mockPublishApi(t);
    t.mock.method(inquirer, 'prompt', async (questions) => {
      const name = questions[0].name;

      if (name === 'hasReadGuidelines') {
        return { hasReadGuidelines: true };
      }

      if (name === 'value') {
        return { value: true };
      }

      if (name === 'version') {
        return { version: 'patch' };
      }

      if (name === 'text') {
        return { text: 'Fixture patch release.' };
      }

      throw new Error(`Unexpected prompt: ${name}`);
    });
    t.mock.method(app, '_uploadBuildArchive', async ({ archiveStream }) => {
      archiveStream.destroy();
      throw uploadError;
    });

    await assert.rejects(
      () => {
        return app.publish();
      },
      (error) => {
        return error === uploadError;
      },
    );

    const manifest = JSON.parse(await fs.readFile(path.join(appPath, 'app.json'), 'utf8'));
    assert.strictEqual(manifest.version, '1.0.1');
  });
});
