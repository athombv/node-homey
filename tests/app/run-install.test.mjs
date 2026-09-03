import assert from 'node:assert';
import { EventEmitter } from 'node:events';
import { describe, it } from 'node:test';

import { HomeyAPIV2 } from 'homey-api';

import App from '../../lib/App.js';
import AppPython from '../../lib/AppPython.js';
import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';
import { copyFixtureApp } from './helpers.mjs';
import { createFakeHomey } from './fakes.mjs';

describe('app run characterization', () => {
  it('routes a local Homey to the Docker runner with all options', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);
    const { homey } = createFakeHomey();
    const runCalls = [];

    t.mock.method(AthomApi, 'getActiveHomey', async () => {
      return homey;
    });
    t.mock.method(app, 'runDocker', async (options) => {
      runCalls.push(options);
      return 'docker-result';
    });

    const result = await app.run({
      clean: true,
      linkModules: '/tmp/module',
      network: 'host',
      skipBuild: true,
      dockerSocketPath: '/tmp/docker.sock',
      dockerExposedPorts: ['6113/tcp', '5683/udp'],
    });

    assert.strictEqual(result, 'docker-result');
    assert.deepStrictEqual(runCalls, [
      {
        homey,
        clean: true,
        skipBuild: true,
        linkModules: '/tmp/module',
        network: 'host',
        dockerSocketPath: '/tmp/docker.sock',
        dockerExposedPorts: ['6113/tcp', '5683/udp'],
      },
    ]);
  });

  it('rejects remote execution on Homey Cloud', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);
    const { homey } = createFakeHomey({ platform: 'cloud' });

    t.mock.method(AthomApi, 'getActiveHomey', async () => {
      return homey;
    });

    await assert.rejects(() => {
      return app.run({ remote: true });
    }, /Homey Cloud does not support/);
  });

  it('forces the remote runner for a legacy Homey API client', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);
    const homey = Object.create(HomeyAPIV2.prototype);
    const remoteCalls = [];

    t.mock.method(AthomApi, 'getActiveHomey', async () => {
      return homey;
    });
    t.mock.method(app, 'runRemote', async (options) => {
      remoteCalls.push(options);
      return 'remote-result';
    });

    const result = await app.run({ clean: true, skipBuild: true });

    assert.strictEqual(result, 'remote-result');
    assert.strictEqual(remoteCalls[0].homey, homey);
    assert.strictEqual(remoteCalls[0].clean, true);
    assert.strictEqual(remoteCalls[0].skipBuild, true);
  });

  it('connects and installs before announcing a remote session', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);
    const devkit = new EventEmitter();
    let connectCalls = 0;
    devkit.connect = async () => {
      connectCalls += 1;
    };
    const homey = {
      id: 'homey-1',
      devkit,
    };
    const installCalls = [];

    t.mock.method(app, 'install', async (options) => {
      installCalls.push(options);
      return { appId: 'com.test.node-basic', session: 'session-1' };
    });
    t.mock.method(App, 'monitorCtrlC', async () => {});

    await app.runRemote({ homey, clean: true, skipBuild: true });

    assert.strictEqual(connectCalls, 1);
    assert.deepStrictEqual(installCalls, [
      {
        homey,
        clean: true,
        skipBuild: true,
        debug: true,
        dockerSocketPath: undefined,
        findLinks: undefined,
      },
    ]);
    assert.strictEqual(devkit.listenerCount('std'), 1);
    assert.strictEqual(devkit.listenerCount('disconnect'), 1);
  });
});

describe('app install characterization', () => {
  it('preprocesses, validates, packs, and forwards install options', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);
    const { calls, homey } = createFakeHomey();
    const archive = { kind: 'archive' };
    const stages = [];

    t.mock.method(app, 'preprocess', async () => {
      stages.push('preprocess');
    });
    t.mock.method(app, '_validate', async () => {
      stages.push('validate');
      return true;
    });
    t.mock.method(app, '_getPackStream', async (options) => {
      stages.push({ pack: options });
      return archive;
    });
    t.mock.method(app, '_getEnv', async () => {
      return { API_KEY: 'fixture' };
    });

    const result = await app.install({ homey, clean: true, debug: true });

    assert.deepStrictEqual(stages, [
      'preprocess',
      'validate',
      { pack: { appPath: app._homeyBuildPath } },
    ]);
    assert.deepStrictEqual(calls.runApp, [
      {
        app: archive,
        env: { API_KEY: 'fixture' },
        debug: true,
        clean: true,
      },
    ]);
    assert.strictEqual(result.appId, 'com.test.app');
  });

  it('rejects installation on Homey Cloud before building', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);
    const { homey } = createFakeHomey({ platform: 'cloud' });
    const preprocess = t.mock.method(app, 'preprocess', async () => {});

    await assert.rejects(() => {
      return app.install({ homey });
    }, /not available on Homey Cloud/);

    assert.strictEqual(preprocess.mock.callCount(), 0);
  });

  it('characterizes a devkit install failure as logging and process.exit without a code', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);
    const { homey } = createFakeHomey({
      devkit: {
        async runApp() {
          throw new Error('install failed');
        },
      },
    });
    const exitCalls = [];

    t.mock.method(app, 'preprocess', async () => {});
    t.mock.method(app, '_validate', async () => {
      return true;
    });
    t.mock.method(app, '_getPackStream', async () => {
      return {};
    });
    t.mock.method(app, '_getEnv', async () => {
      return {};
    });
    t.mock.method(Log, 'error', () => {});
    t.mock.method(process, 'exit', (code) => {
      exitCalls.push(code);
    });

    const result = await app.install({ homey });

    assert.strictEqual(result, undefined);
    assert.deepStrictEqual(exitCalls, [undefined]);
  });
});

describe('Python app run characterization', () => {
  it('routes published ports to the Python Docker runner', async (t) => {
    const appPath = await copyFixtureApp(t, 'python-basic');
    const app = new AppPython(appPath);
    const { homey } = createFakeHomey();
    const runCalls = [];

    t.mock.method(AthomApi, 'getActiveHomey', async () => {
      return homey;
    });
    t.mock.method(app, 'runDocker', async (options) => {
      runCalls.push(options);
    });

    await app.run({ dockerExposedPorts: ['5683/udp'] });

    assert.deepStrictEqual(runCalls, [
      {
        homey,
        clean: false,
        skipBuild: false,
        linkModules: '',
        network: undefined,
        dockerSocketPath: undefined,
        findLinks: undefined,
        dockerExposedPorts: ['5683/udp'],
      },
    ]);
  });

  it('rejects legacy Homey API clients', async (t) => {
    const appPath = await copyFixtureApp(t, 'python-basic');
    const app = new AppPython(appPath);
    const { homey } = createFakeHomey({ __properties: { apiVersion: 2 } });

    t.mock.method(AthomApi, 'getActiveHomey', async () => {
      return homey;
    });

    await assert.rejects(() => {
      return app.run();
    }, /Python apps are currently not supported/);
  });

  it('always preprocesses a Python app even when skip-build is requested', async (t) => {
    const appPath = await copyFixtureApp(t, 'python-basic');
    const app = new AppPython(appPath);
    const calls = [];
    const skipBuild = true;

    t.mock.method(app, 'preprocess', async (options) => {
      calls.push(options);
    });

    await app.buildForLocalRunner(skipBuild, {
      findLinks: '/wheels',
      dockerSocketPath: '/tmp/docker.sock',
    });

    assert.deepStrictEqual(calls, [
      {
        platforms: [AppPython.getLocalPlatform()],
        dockerSocketPath: '/tmp/docker.sock',
        findLinks: '/wheels',
      },
    ]);
  });
});
