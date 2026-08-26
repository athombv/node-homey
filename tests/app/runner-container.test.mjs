import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import App from '../../lib/App.js';
import AppPython from '../../lib/AppPython.js';
import DockerHelper from '../../lib/DockerHelper.js';
import { createFakeDocker, createFakeHomey } from './fakes.mjs';
import { copyFixtureApp } from './helpers.mjs';

function setEnvironment(t, values) {
  const originalValues = {};

  for (const [key, value] of Object.entries(values)) {
    originalValues[key] = process.env[key];

    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  t.after(() => {
    for (const [key, value] of Object.entries(originalValues)) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });
}

describe('runner container characterization', () => {
  it('builds the Node.js runner environment, labels, ports, and bind mounts', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const linkedModulePath = path.join(appPath, 'linked-module');
    const app = new App(appPath);
    const { calls, docker } = createFakeDocker();
    const { homey } = createFakeHomey();

    await fs.mkdir(linkedModulePath);
    await fs.writeFile(
      path.join(linkedModulePath, 'package.json'),
      JSON.stringify({ name: '@fixture/linked-module' }),
    );
    setEnvironment(t, {
      HOMEY_APP_RUNNER_ID: 'fixture/node-runner:1',
      HOMEY_APP_RUNNER_DEVMODE: '1',
      HOMEY_APP_RUNNER_PATH: undefined,
      HOMEY_APP_RUNNER_SDK_PATH: undefined,
    });
    t.mock.method(DockerHelper, 'determineHost', async () => {
      return '172.17.0.1';
    });

    await app.startRunnerContainer(
      'session-1',
      { id: 'com.test.node-basic', version: '1.0.0', runtime: 'nodejs' },
      { API_KEY: 'fixture' },
      31000,
      9229,
      'fixture-network',
      homey,
      '/tmp/homey-fixture',
      '/tmp/homey-userdata',
      linkedModulePath,
      docker,
    );

    assert.strictEqual(calls.run.length, 1);
    const run = calls.run[0];
    assert.strictEqual(run.image, 'fixture/node-runner:1');
    assert.deepStrictEqual(run.command, ['node', '--inspect=0.0.0.0:9229', 'index.js']);
    assert.ok(run.options.Env.includes('APP_ENV={"API_KEY":"fixture"}'));
    assert.ok(run.options.Env.includes('SERVER=ws://172.17.0.1:31000'));
    assert.ok(run.options.Env.includes('DEVMODE=1'));
    assert.strictEqual(run.options.Labels['com.athom.app-runtime'], 'nodejs');
    assert.strictEqual(run.options.HostConfig.NetworkMode, 'fixture-network');
    assert.deepStrictEqual(run.options.HostConfig.PortBindings['9229/tcp'], [{ HostPort: '9229' }]);
    assert.ok(run.options.HostConfig.Binds.includes(`${app._homeyBuildPath}:/app:ro,z`));
    assert.ok(run.options.HostConfig.Binds.includes('/tmp/homey-fixture:/tmp:rw,z'));
    assert.ok(run.options.HostConfig.Binds.includes('/tmp/homey-userdata:/userdata:rw,z'));
    assert.ok(
      run.options.HostConfig.Binds.includes(
        `${linkedModulePath}:/app/node_modules/@fixture/linked-module`,
      ),
    );
  });

  it('builds Python-specific runner mounts, labels, and user mapping', async (t) => {
    const appPath = await copyFixtureApp(t, 'python-basic');
    const app = new AppPython(appPath);
    const { calls, docker } = createFakeDocker();
    const { homey } = createFakeHomey();

    setEnvironment(t, {
      HOMEY_APP_RUNNER_ID_PYTHON: 'fixture/python-runner:1',
      HOMEY_APP_RUNNER_DEVMODE: undefined,
      HOMEY_APP_RUNNER_PATH_PYTHON: undefined,
      HOMEY_APP_RUNNER_SDK_PATH_PYTHON: undefined,
    });
    t.mock.method(DockerHelper, 'determineHost', async () => {
      return '172.17.0.1';
    });

    await app.startRunnerContainer(
      'session-python',
      { id: 'com.test.python-basic', version: '1.0.0', runtime: 'python' },
      {},
      32000,
      undefined,
      'bridge',
      homey,
      '/tmp/python-fixture',
      '/tmp/python-userdata',
      '',
      docker,
    );

    const run = calls.run[0];
    assert.strictEqual(run.image, 'fixture/python-runner:1');
    assert.deepStrictEqual(run.command, ['bash', 'entrypoint.sh']);
    assert.strictEqual(run.options.Labels['com.athom.app-runtime'], 'python');
    assert.strictEqual(run.options.HostConfig.NetworkMode, 'bridge');
    assert.ok(run.options.HostConfig.Binds.includes(`${app._homeyBuildPath}:/app`));
    assert.ok(run.options.HostConfig.Binds.includes('/tmp/python-userdata:/userdata:rw,z'));

    if (process.getuid !== undefined) {
      assert.strictEqual(run.options.User, `${process.getuid()}:${process.getgid()}`);
    }
  });

  it('propagates a Docker runner failure', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const app = new App(appPath);
    const error = new Error('container failed');
    const { docker } = createFakeDocker({
      async run() {
        throw error;
      },
    });
    const { homey } = createFakeHomey();

    setEnvironment(t, { HOMEY_APP_RUNNER_ID: 'fixture/node-runner:1' });
    t.mock.method(DockerHelper, 'determineHost', async () => {
      return '172.17.0.1';
    });

    await assert.rejects(
      () => {
        return app.startRunnerContainer(
          'session-1',
          { id: 'com.test.node-basic', version: '1.0.0', runtime: 'nodejs' },
          {},
          31000,
          9229,
          'bridge',
          homey,
          '/tmp/homey-fixture',
          '/tmp/homey-userdata',
          '',
          docker,
        );
      },
      (actualError) => {
        return actualError === error;
      },
    );
  });
});
