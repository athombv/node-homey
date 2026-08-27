import assert from 'node:assert';
import os from 'node:os';
import { describe, it } from 'node:test';

import Docker from 'dockerode';

import DockerHelper from '../../lib/DockerHelper.js';
import Settings from '../../services/Settings.js';
import { createFakeDocker } from '../app/fakes.mjs';

describe('DockerHelper characterization', () => {
  it('constructs and pings Docker through a custom socket', async (t) => {
    const ping = t.mock.method(Docker.prototype, 'ping', async () => {});

    const docker = await DockerHelper.ensureDocker({
      dockerSocketPath: '/tmp/fixture-docker.sock',
    });

    assert.strictEqual(ping.mock.callCount(), 1);
    assert.strictEqual(docker.modem.socketPath, '/tmp/fixture-docker.sock');
  });

  it('finds an image by exact repository tag', async (t) => {
    const { docker } = createFakeDocker({
      async listImages() {
        return [
          { RepoTags: null },
          { RepoTags: ['fixture/other:latest'] },
          { RepoTags: ['fixture/runner:latest'] },
        ];
      },
    });

    t.mock.method(DockerHelper, 'ensureDocker', async () => {
      return docker;
    });

    const image = await DockerHelper.imageExists('fixture/runner:latest');

    assert.deepStrictEqual(image, { RepoTags: ['fixture/runner:latest'] });
  });

  it('requires an image pull when no check has been recorded', async (t) => {
    t.mock.method(Settings, 'get', async () => {
      return null;
    });

    assert.strictEqual(await DockerHelper.imageNeedPull('fixture/runner:latest'), true);
  });

  it('does not pull an image checked less than twelve hours ago', async (t) => {
    t.mock.method(Settings, 'get', async () => {
      return new Date(Date.now() - 60 * 60 * 1000);
    });

    assert.strictEqual(await DockerHelper.imageNeedPull('fixture/runner:latest'), false);
  });

  it('records the pull check and follows Docker progress', async (t) => {
    const { calls, docker } = createFakeDocker();
    const settingsCalls = [];

    t.mock.method(DockerHelper, 'ensureDocker', async () => {
      return docker;
    });
    t.mock.method(Settings, 'set', async (...args) => {
      settingsCalls.push(args);
    });

    await DockerHelper.imagePull('fixture/runner:latest', 'linux/arm64');

    assert.strictEqual(settingsCalls.length, 1);
    assert.strictEqual(settingsCalls[0][0], 'dockerPullLastCheck-fixture/runner:latest-platform');
    assert.ok(settingsCalls[0][1] instanceof Date);
    assert.deepStrictEqual(calls.pull, [
      {
        image: 'fixture/runner:latest',
        options: { platform: 'linux/arm64' },
      },
    ]);
  });

  it('stops, waits for, and removes only the matching session container', async (t) => {
    const actions = [];
    const { docker } = createFakeDocker({
      async listContainers() {
        return [
          { Id: 'other', Labels: { 'com.athom.session': 'session-other' } },
          { Id: 'match', Labels: { 'com.athom.session': 'session-1' } },
        ];
      },
      getContainer(id) {
        assert.strictEqual(id, 'match');
        return {
          async stop() {
            actions.push('stop');
          },
          async wait() {
            actions.push('wait');
          },
          async remove() {
            actions.push('remove');
          },
        };
      },
    });

    t.mock.method(DockerHelper, 'ensureDocker', async () => {
      return docker;
    });

    await DockerHelper.deleteContainerBySessionId('session-1');

    assert.deepStrictEqual(actions, ['stop', 'wait', 'remove']);
  });

  it('removes every container matching an app id', async (t) => {
    const removed = [];
    const { docker } = createFakeDocker({
      async listContainers() {
        return [
          { Id: 'first', Labels: { 'com.athom.app-id': 'com.test.app' } },
          { Id: 'other', Labels: { 'com.athom.app-id': 'com.test.other' } },
          { Id: 'second', Labels: { 'com.athom.app-id': 'com.test.app' } },
        ];
      },
      getContainer(id) {
        return {
          async stop() {},
          async wait() {},
          async remove() {
            removed.push(id);
          },
        };
      },
    });

    t.mock.method(DockerHelper, 'ensureDocker', async () => {
      return docker;
    });

    await DockerHelper.deleteContainerByManifestAppId('com.test.app');

    assert.deepStrictEqual(removed, ['first', 'second']);
  });

  it('uses the configured Docker gateway without network discovery', async (t) => {
    const originalGateway = process.env.DOCKER_HOST_GATEWAY;
    process.env.DOCKER_HOST_GATEWAY = 'fixture.docker.internal';
    t.after(() => {
      if (originalGateway === undefined) {
        delete process.env.DOCKER_HOST_GATEWAY;
      } else {
        process.env.DOCKER_HOST_GATEWAY = originalGateway;
      }
    });
    const outboundIp = t.mock.method(DockerHelper, 'getOutboundIp', async () => {
      throw new Error('must not run');
    });

    assert.strictEqual(await DockerHelper.determineHost(), 'fixture.docker.internal');
    assert.strictEqual(outboundIp.mock.callCount(), 0);
  });

  it('falls back to the Linux bridge when outbound discovery fails', async (t) => {
    const originalGateway = process.env.DOCKER_HOST_GATEWAY;
    delete process.env.DOCKER_HOST_GATEWAY;
    t.after(() => {
      if (originalGateway !== undefined) {
        process.env.DOCKER_HOST_GATEWAY = originalGateway;
      }
    });

    t.mock.method(os, 'platform', () => {
      return 'linux';
    });
    t.mock.method(DockerHelper, 'getOutboundIp', async () => {
      throw new Error('no route');
    });

    assert.strictEqual(await DockerHelper.determineHost(), '172.17.0.1');
  });
});
