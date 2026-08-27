import { EventEmitter } from 'node:events';

export function createFakeHomey(overrides = {}) {
  const calls = {
    connect: 0,
    installApp: [],
    runApp: [],
    stopApp: [],
    uninstallApp: [],
  };
  const devkit = new EventEmitter();

  Object.assign(devkit, {
    async connect() {
      calls.connect += 1;
    },
    async installApp(options) {
      calls.installApp.push(options);
      return { sessionId: 'session-1' };
    },
    async runApp(options) {
      calls.runApp.push(options);
      return { appId: 'com.test.app', session: 'session-1' };
    },
    async stopApp(options) {
      calls.stopApp.push(options);
    },
    async uninstallApp(options) {
      calls.uninstallApp.push(options);
    },
    ...overrides.devkit,
  });

  return {
    calls,
    homey: {
      id: 'homey-1',
      name: 'Test Homey',
      model: 'Homey Pro',
      platform: 'local',
      baseUrl: 'http://homey.test',
      __properties: { apiVersion: 3 },
      ...overrides,
      devkit,
    },
  };
}

export function createFakeDocker(overrides = {}) {
  const calls = {
    getContainer: [],
    listContainers: [],
    listImages: 0,
    pull: [],
    run: [],
  };

  const docker = {
    modem: {
      followProgress(stream, onFinished) {
        onFinished(null, []);
      },
    },
    async listContainers(options) {
      calls.listContainers.push(options);
      return [];
    },
    async listImages() {
      calls.listImages += 1;
      return [];
    },
    getContainer(id) {
      calls.getContainer.push(id);
      return {
        async stop() {},
        async wait() {},
        async remove() {},
      };
    },
    pull(image, options, callback) {
      calls.pull.push({ image, options });
      callback(null, {});
    },
    async run(image, command, output, options) {
      calls.run.push({ image, command, output, options });
    },
    ...overrides,
  };

  return { calls, docker };
}
