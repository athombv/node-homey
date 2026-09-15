'use strict';

const { randomUUID } = require('crypto');
const { mkdir, readFile, rename, rm, writeFile } = require('fs/promises');
const path = require('path');
const lockfile = require('proper-lockfile');

const Settings = require('../services/Settings');

class AthomApiProfileCache {
  constructor() {
    this._path = path.join(Settings.getSettingsDirectory(), 'profile-cache.json');
  }

  async get() {
    try {
      return JSON.parse(await readFile(this._path, 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT' || err instanceof SyntaxError) {
        return null;
      }

      throw err;
    }
  }

  async set(value) {
    return await this._update((stored) => {
      if ((stored?.generation ?? null) !== (value.generation ?? null)) {
        return undefined;
      }

      if (stored?.authKey !== value.authKey) {
        return value;
      }

      const profile = stored.updatedAt > value.updatedAt ? stored : value;
      const merged = { ...profile };

      if (stored.retryAfter > Date.now()) {
        merged.retryAfter = stored.retryAfter;
      } else {
        delete merged.retryAfter;
      }

      return merged;
    });
  }

  async setRetryAfter({ authKey, retryAfter, generation = null }) {
    return await this._update((stored) => {
      if ((stored?.generation ?? null) !== generation) {
        return undefined;
      }

      // Never restore the pre-request snapshot after a refresh, login, or logout.
      if (!stored?.user || stored.authKey !== authKey) {
        return undefined;
      }

      return { ...stored, retryAfter: Math.max(stored.retryAfter || 0, retryAfter) };
    });
  }

  async clear() {
    await this._update(() => {
      // Retain only an invalidation marker so in-flight requests cannot restore account data.
      return { generation: randomUUID() };
    });
  }

  async _update(update) {
    await mkdir(path.dirname(this._path), { recursive: true });
    let lockError;
    const release = await lockfile.lock(this._path, {
      realpath: false,
      retries: { retries: 20, minTimeout: 10, maxTimeout: 100, randomize: true },
      onCompromised: (err) => {
        lockError = err;
      },
    });

    try {
      const stored = await this.get();
      const value = update(stored);

      if (lockError) {
        throw lockError;
      }

      if (value) {
        await this._write(value);
      }

      return value;
    } finally {
      await release();
    }
  }

  async _write(value) {
    const temporaryPath = `${this._path}.${randomUUID()}.tmp`;

    // Readers always see a complete entry while writers hold the cross-process lock.
    try {
      await writeFile(temporaryPath, JSON.stringify(value), { mode: 0o600 });
      await rename(temporaryPath, this._path);
    } finally {
      await rm(temporaryPath, { force: true });
    }
  }
}

module.exports = { AthomApiProfileCache };
