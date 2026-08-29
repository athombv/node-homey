'use strict';

const StorageAdapter = require('homey-api/lib/AthomCloudAPI/StorageAdapter');
const Settings = require('../services/Settings');
const { OperatingSystemCredentialStore } = require('./OperatingSystemCredentialStore.mjs');

module.exports = class extends StorageAdapter {
  constructor({ credentialId = null, legacy = true, store = 'settings' } = {}) {
    super();

    this._credentialId = credentialId;
    this._legacy = legacy;
    this._store = store;
  }

  async get() {
    if (this._legacy) {
      const value = await Settings.get('homeyApi');

      return value ?? {};
    }

    if (this._store === 'keychain') {
      const credential = await OperatingSystemCredentialStore.get(this._credentialId);

      return credential?.value ?? {};
    }

    const credentials = await Settings.get('credentials');
    const value = credentials?.entries?.[this._credentialId]?.value;

    return value ?? {};
  }

  async set(value) {
    if (this._legacy) {
      return await Settings.set('homeyApi', value);
    }

    if (this._store === 'keychain') {
      await OperatingSystemCredentialStore.set(this._credentialId, {
        kind: 'oauth',
        value,
      });

      return value;
    }

    await Settings.update((settings) => {
      const credentials = settings.credentials;

      if (!credentials || credentials.schemaVersion !== 1) {
        throw new Error('Authentication credential state has not been initialized.');
      }

      const entry = credentials.entries[this._credentialId];

      if (!entry) {
        throw new Error(`Authentication credential does not exist: ${this._credentialId}`);
      }

      entry.value = value;
    });

    return value;
  }
};
