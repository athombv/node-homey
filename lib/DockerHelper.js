/**
 * Docker helper util
 *
 * This module is created to separate the Docker logic from business logic.
 */

'use strict';

const os = require('os');
const childProcess = require('child_process');

const Docker = require('dockerode');
const isWsl = require('is-wsl');

const Log = require('./Log');
const Settings = require('../services/Settings');

class DockerHelper {

  static #dockerInstanceCache = null;

  /**
   * Ensure there is a Docker instance
   *
   * @throws Error when docker is not reachable
   * @returns {Promise<Docker>} A docker instance
   */
  static async ensureDocker({ dockerSocketPath } = {}) {
    const dockerOptions = {};
    if (dockerSocketPath) {
      dockerOptions.socketPath = dockerSocketPath;
    }
    const docker = DockerHelper.#dockerInstanceCache || new Docker(dockerOptions);
    DockerHelper.#dockerInstanceCache = docker;

    await docker.ping().catch(err => {
      Log.info(err.message);
      let dockerUrl;
      switch (os.platform()) {
        case 'darwin': {
          dockerUrl = 'https://docs.docker.com/docker-for-mac/install/';
          break;
        }
        case 'win32': {
          dockerUrl = 'https://docs.docker.com/docker-for-windows/install/';
          break;
        }
        default: {
          dockerUrl = 'https://docs.docker.com/desktop/';
        }
      }

      throw new Error(`Could not connect to Docker. Is it running?\nIf you haven't installed Docker yet, please download & install it first:\n\n   ${dockerUrl}`);
    });
    return docker;
  }

  /**
   * @param {string} imageName The name of the image
   * @returns {boolean}
   */
  static async imageExists(imageName) {
    const docker = await this.ensureDocker();

    const images = await docker.listImages();
    return images.find(image => Array.isArray(image.RepoTags) && image.RepoTags.includes(imageName));
  }

  /**
   * @param {string} imageName The name of the image
   * @returns {boolean} Whether the image needs to be repulled ('true' after 12 hours)
   */
  static async imageNeedPull(imageName) {
    const now = new Date();

    let lastCheck = await Settings.get(`dockerPullLastCheck-${imageName}`);

    if (lastCheck === null) {
      return true;
    }

    lastCheck = new Date(lastCheck);
    const hours = Math.abs(now - lastCheck) / 36e5;

    return hours > 12;
  }

  /**
   * @param {string} imageName The name of the image to pull
   */
  static async imagePull(imageName, platform = undefined) {
    const docker = await this.ensureDocker();

    // Adjust settings
    await Settings.set(`dockerPullLastCheck-${imageName}`, new Date());

    Log.success('Downloading Docker Image...');
    await new Promise((resolve, reject) => {
      docker.pull(
        imageName,
        {
          platform,
        },
        // Callback:
        (err, stream) => {
          if (err) return reject(err);

          docker.modem.followProgress(
            stream,
            // onFinish:
            err => {
              if (err) return reject(err);
              return resolve();
            },
            // onProgress:
            ({ id, status, progressDetail }) => {
              if (progressDetail && progressDetail.total) {
                if (id) {
                  Log.info(` — [${id}] ${status} ${Math.round((progressDetail.current / progressDetail.total) * 100)}%`);
                } else {
                  Log.info(` — ${status} ${Math.round((progressDetail.current / progressDetail.total) * 100)}%`);
                }
              } else if (id) {
                Log.info(` — [${id}] ${status}`);
              } else {
                Log.info(` — ${status}`);
              }
            },
            //
          );
        },
        //
      );
    });
  }

  /**
   * @param {string} sessionId container['Labels']['com.athom.session']
   */
  static async deleteContainerBySessionId(sessionId) {
    const docker = await this.ensureDocker();

    Log.success('Removing container...');
    const containers = await docker.listContainers({
      all: true,
    });
    const container = containers.find(container => {
      return container['Labels']['com.athom.session'] === sessionId;
    });

    if (container) {
      const containerInstance = docker.getContainer(container['Id']);
      await containerInstance.stop().catch(() => { });
      await containerInstance.wait().catch(() => { });
      await containerInstance.remove().catch(() => { });
    }

    Log.success('Removed container');
  }

  /**
   * @param {string} appId container['Labels']['com.athom.app-id']
   */
  static async deleteContainerByManifestAppId(appId) {
    const docker = await this.ensureDocker();

    const containers = await docker.listContainers({
      all: true,
    });

    for (const container of containers) {
      if (container['Labels']['com.athom.app-id'] === appId) {
        const containerInstance = docker.getContainer(container['Id']);
        await containerInstance.stop().catch(() => { });
        await containerInstance.wait().catch(() => { });
        await containerInstance.remove().catch(() => { });
        Log.success('Removed existing container');
      }
    }
  }

  /**
   * @returns {Promise<string>} e.g. host.docker.internal
   */
  static async determineHost() {
    // Not linux or wsl:
    if (process.platform !== 'linux') {
      return 'host.docker.internal';
    }

    // Linux:
    if (!isWsl) {
      return process.env.DOCKER_HOST_GATEWAY || '172.17.0.1';
    }

    // WSL: (Windows Subsystem for Linux)
    return new Promise((resolve, reject) => {
      childProcess.exec('wsl.exe hostname -I | awk \'{print $1;}\'', (err, stdout) => {
        if (err) return reject(err);
        return resolve(stdout.trim());
      });
    });
  }

}

module.exports = DockerHelper;
