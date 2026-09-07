'use strict';

const { randomUUID } = require('crypto');
const { mkdir, readFile, rename, rm, writeFile } = require('fs/promises');
const path = require('path');

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
    await mkdir(path.dirname(this._path), { recursive: true });
    const temporaryPath = `${this._path}.${randomUUID()}.tmp`;

    // Publish the profile and its authentication metadata together, even with concurrent writers.
    try {
      await writeFile(temporaryPath, JSON.stringify(value), { mode: 0o600 });
      await rename(temporaryPath, this._path);
    } finally {
      await rm(temporaryPath, { force: true });
    }
  }

  async clear() {
    await rm(this._path, { force: true });
  }
}

module.exports = { AthomApiProfileCache };
