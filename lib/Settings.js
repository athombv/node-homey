'use strict';

const os = require('os');
const fs = require('fs');
const path = require('path');
const util = require('util');

const Log = require('./Log');

const statAsync = util.promisify(fs.stat);
const readFileAsync = util.promisify(fs.readFile);
const writeFileAsync = util.promisify(fs.writeFile);
const mkdirAsync = util.promisify(fs.mkdir);
const renameAsync = util.promisify(fs.rename);
const rmAsync = util.promisify(fs.rm);

const LOCK_RETRY_INTERVAL = 25;
const LOCK_TIMEOUT = 5000;
const STALE_LOCK_AGE = 30000;
const DEFAULT_DISCOVERY_STRATEGIES = ['localSecure', 'local', 'remoteForwarded', 'cloud'];

function synchronizeLegacySelection(settings, activeHomey) {
  const contextState = settings.contextState ?? {
    schemaVersion: 1,
    current: null,
    contexts: {},
  };

  if (contextState.schemaVersion !== 1) {
    throw new Error(
      `Unsupported context state schema version: ${String(contextState.schemaVersion)}`,
    );
  }

  settings.contextState = contextState;

  if (!settings.authenticationProfiles) {
    settings.authenticationProfiles = {
      schemaVersion: 1,
      profiles: {},
    };
  }

  if (!settings.credentials) {
    settings.credentials = {
      schemaVersion: 1,
      defaultStore: 'settings',
      entries: {},
    };
  }

  if (!activeHomey) {
    contextState.current = null;
    return;
  }

  const strategies =
    activeHomey.platform === 'cloud' ? ['cloud'] : [...DEFAULT_DISCOVERY_STRATEGIES];
  contextState.contexts.default = {
    target: {
      homeyId: activeHomey.id,
      name: activeHomey.name ?? null,
      platform: activeHomey.platform ?? null,
    },
    authenticationProfile: 'default',
    route: {
      type: 'discovery',
      strategies,
    },
  };
  contextState.current = 'default';

  if (!settings.authenticationProfiles.profiles.default) {
    settings.authenticationProfiles.profiles.default = {
      accountId: null,
      email: null,
      displayName: null,
      credentialSource: {
        type: 'oauth',
        credentialId: 'legacy-homey-api',
        store: 'settings',
        legacy: true,
      },
      authenticated: Boolean(settings.homeyApi),
    };
  }
}

class Settings {
  constructor() {
    this._settings = null;
    this._settingsPath = this.getSettingsPath();
  }

  getSettingsDirectory() {
    if (process.env.HOMEY_HOME) {
      return process.env.HOMEY_HOME;
    }

    const platform = os.platform();

    if (platform === 'win32') {
      return path.join(process.env.APPDATA, 'athom-cli');
    }

    return path.join(process.env.HOME, '.athom-cli');
  }

  getSettingsPath() {
    return path.join(this.getSettingsDirectory(), 'settings.json');
  }

  async _getSettings() {
    if (this._settings) return this._settings;

    try {
      const data = await readFileAsync(this._settingsPath, 'utf8');
      const json = JSON.parse(data);
      this._settings = json;
    } catch (err) {
      if (err.code !== 'ENOENT') Log(err);
      this._settings = {};
    }
    return this._settings;
  }

  async _readSettingsFresh() {
    try {
      const data = await readFileAsync(this._settingsPath, 'utf8');
      return JSON.parse(data);
    } catch (err) {
      if (err.code === 'ENOENT') {
        return {};
      }

      throw err;
    }
  }

  async _ensureSettingsDirectory() {
    const dir = path.dirname(this._settingsPath);

    await mkdirAsync(dir, { recursive: true });
  }

  async _acquireLock() {
    const lockPath = `${this._settingsPath}.lock`;
    const startedAt = Date.now();

    while (true) {
      try {
        await mkdirAsync(lockPath);
        return lockPath;
      } catch (err) {
        if (err.code !== 'EEXIST') {
          throw err;
        }

        try {
          const lockStats = await statAsync(lockPath);
          const lockAge = Date.now() - lockStats.mtimeMs;

          if (lockAge > STALE_LOCK_AGE) {
            await rmAsync(lockPath, { recursive: true, force: true });
            continue;
          }
        } catch (statError) {
          if (statError.code !== 'ENOENT') {
            throw statError;
          }
        }

        if (Date.now() - startedAt >= LOCK_TIMEOUT) {
          throw new Error(`Timed out waiting for CLI settings lock: ${lockPath}`);
        }

        await new Promise((resolve) => {
          setTimeout(resolve, LOCK_RETRY_INTERVAL);
        });
      }
    }
  }

  async _writeSettingsAtomically(settings) {
    const temporaryPath = `${this._settingsPath}.${process.pid}.${Date.now()}.tmp`;
    const json = JSON.stringify(settings, false, 4);

    try {
      await writeFileAsync(temporaryPath, json, { mode: 0o600 });
      await renameAsync(temporaryPath, this._settingsPath);
    } finally {
      await rmAsync(temporaryPath, { force: true });
    }
  }

  async get(key) {
    await this._getSettings();
    return this._settings[key] || null;
  }

  async set(key, value) {
    await this.update((settings) => {
      settings[key] = value;

      if (key === 'activeHomey') {
        synchronizeLegacySelection(settings, value);
      }
    });

    return value;
  }

  async unset(key) {
    return this.set(key, null);
  }

  async update(mutator) {
    await this._ensureSettingsDirectory();
    const lockPath = await this._acquireLock();

    try {
      const settings = await this._readSettingsFresh();

      await mutator(settings);
      await this._writeSettingsAtomically(settings);
      this._settings = settings;

      return settings;
    } finally {
      await rmAsync(lockPath, { recursive: true, force: true });
    }
  }
}

module.exports = Settings;
