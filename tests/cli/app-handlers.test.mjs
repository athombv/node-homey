import assert from 'node:assert';
import { describe, it } from 'node:test';

import AppFactory from '../../lib/AppFactory.js';
import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';
import { handler as buildHandler } from '../../bin/cmds/app/build.mjs';
import { handler as installHandler } from '../../bin/cmds/app/install.mjs';
import { handler as publishHandler } from '../../bin/cmds/app/publish.mjs';
import { handler as runHandler } from '../../bin/cmds/app/run.mjs';
import { handler as validateHandler } from '../../bin/cmds/app/validate.mjs';

function captureExit(t) {
  const calls = [];

  t.mock.method(process, 'exit', (code) => {
    calls.push(code);
  });

  return calls;
}

describe('CLI app handler characterization', () => {
  it('forwards build options and exits successfully', async (t) => {
    const calls = [];
    const exits = captureExit(t);

    t.mock.method(AppFactory, 'getAppInstance', (appPath) => {
      assert.strictEqual(appPath, '/fixture/app');
      return {
        async build(options) {
          calls.push(options);
        },
      };
    });

    await buildHandler({
      path: '/fixture/app',
      dockerSocketPath: '/tmp/docker.sock',
      findLinks: '/wheels',
    });

    assert.deepStrictEqual(calls, [{ dockerSocketPath: '/tmp/docker.sock', findLinks: '/wheels' }]);
    assert.deepStrictEqual(exits, [0]);
  });

  it('preprocesses and forwards the validation level', async (t) => {
    const calls = [];
    const exits = captureExit(t);

    t.mock.method(AppFactory, 'getAppInstance', () => {
      return {
        async preprocess(options) {
          calls.push({ preprocess: options });
        },
        async validate(options) {
          calls.push({ validate: options });
        },
      };
    });

    await validateHandler({
      path: '/fixture/app',
      level: 'verified',
      dockerSocketPath: '/tmp/docker.sock',
      findLinks: '/wheels',
    });

    assert.deepStrictEqual(calls, [
      {
        preprocess: {
          copyAppProductionDependencies: false,
          dockerSocketPath: '/tmp/docker.sock',
          findLinks: '/wheels',
        },
      },
      { validate: { level: 'verified' } },
    ]);
    assert.deepStrictEqual(exits, [0]);
  });

  it('forwards every run option without forcing an exit on success', async (t) => {
    const calls = [];
    const exits = captureExit(t);

    t.mock.method(AppFactory, 'getAppInstance', () => {
      return {
        async run(options) {
          calls.push(options);
        },
      };
    });

    await runHandler({
      path: '/fixture/app',
      clean: true,
      remote: true,
      skipBuild: true,
      linkModules: '/fixture/module',
      network: 'host',
      dockerSocketPath: '/tmp/docker.sock',
      findLinks: '/wheels',
      dockerExposedPorts: ['6113/tcp', '5683/udp'],
    });

    assert.deepStrictEqual(calls, [
      {
        clean: true,
        remote: true,
        skipBuild: true,
        linkModules: '/fixture/module',
        network: 'host',
        dockerSocketPath: '/tmp/docker.sock',
        findLinks: '/wheels',
        dockerExposedPorts: ['6113/tcp', '5683/udp'],
      },
    ]);
    assert.deepStrictEqual(exits, []);
  });

  it('gets the active Homey and forwards install options', async (t) => {
    const homey = { id: 'homey-1' };
    const calls = [];
    const exits = captureExit(t);

    t.mock.method(AthomApi, 'getActiveHomey', async () => {
      return homey;
    });
    t.mock.method(AppFactory, 'getAppInstance', () => {
      return {
        async install(options) {
          calls.push(options);
        },
      };
    });

    await installHandler({ path: '/fixture/app', clean: true, skipBuild: true });

    assert.deepStrictEqual(calls, [{ homey, clean: true, skipBuild: true }]);
    assert.deepStrictEqual(exits, [0]);
  });

  it('forwards publish options and exits successfully', async (t) => {
    const calls = [];
    const exits = captureExit(t);

    t.mock.method(AppFactory, 'getAppInstance', () => {
      return {
        async publish(options) {
          calls.push(options);
        },
      };
    });

    await publishHandler({
      path: '/fixture/app',
      dockerSocketPath: '/tmp/docker.sock',
      findLinks: '/wheels',
    });

    assert.deepStrictEqual(calls, [{ dockerSocketPath: '/tmp/docker.sock', findLinks: '/wheels' }]);
    assert.deepStrictEqual(exits, [0]);
  });

  it('logs a build error and exits with failure', async (t) => {
    const error = new Error('build failed');
    const errors = [];
    const exits = captureExit(t);

    t.mock.method(AppFactory, 'getAppInstance', () => {
      return {
        async build() {
          throw error;
        },
      };
    });
    t.mock.method(Log, 'error', (actualError) => {
      errors.push(actualError);
    });

    await buildHandler({ path: '/fixture/app' });

    assert.deepStrictEqual(errors, [error]);
    assert.deepStrictEqual(exits, [1]);
  });
});
