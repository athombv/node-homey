import assert from 'node:assert';
import { once } from 'node:events';
import { it } from 'node:test';

import DockerHelper from '../../lib/DockerHelper.js';

const DEFAULT_IMAGE = 'alpine:3.20';

async function pullImage(docker, image) {
  await new Promise((resolve, reject) => {
    docker.pull(image, (error, stream) => {
      if (error) {
        reject(error);
        return;
      }

      docker.modem.followProgress(stream, (progressError) => {
        if (progressError) {
          reject(progressError);
          return;
        }

        resolve();
      });
    });
  });
}

it('runs and removes a labeled container using a real Docker daemon', async () => {
  const image = process.env.HOMEY_TEST_DOCKER_IMAGE || DEFAULT_IMAGE;
  const dockerSocketPath = process.env.HOMEY_TEST_DOCKER_SOCKET;
  const docker = await DockerHelper.ensureDocker({ dockerSocketPath });
  const chunks = [];
  let container;

  try {
    try {
      await docker.getImage(image).inspect();
    } catch {
      await pullImage(docker, image);
    }

    container = await docker.createContainer({
      Image: image,
      Cmd: ['sh', '-c', 'printf homey-cli-docker-smoke'],
      AttachStdout: true,
      AttachStderr: true,
      Labels: {
        'com.athom.test': 'homey-cli-docker-smoke',
      },
    });
    const attachedOutput = await container.attach({
      stream: true,
      stdout: true,
      stderr: true,
    });
    attachedOutput.on('data', (chunk) => {
      chunks.push(chunk);
    });
    const outputEnded = once(attachedOutput, 'end');

    await container.start();
    const result = await container.wait();
    await outputEnded;

    assert.strictEqual(result.StatusCode, 0);
    assert.match(Buffer.concat(chunks).toString(), /homey-cli-docker-smoke/);
  } finally {
    if (container) {
      await container.remove({ force: true });
    }
  }
});
