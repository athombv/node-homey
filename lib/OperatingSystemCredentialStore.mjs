import { Entry } from '@napi-rs/keyring';

const SERVICE_NAME = 'homey-cli';

export class OperatingSystemCredentialStore {
  static async get(credentialId) {
    const entry = new Entry(SERVICE_NAME, credentialId);
    const serialized = entry.getPassword();

    if (!serialized) {
      return null;
    }

    try {
      return JSON.parse(serialized);
    } catch (err) {
      throw new Error(`Credential ${credentialId} contains invalid data.`, { cause: err });
    }
  }

  static async set(credentialId, credential) {
    const entry = new Entry(SERVICE_NAME, credentialId);

    entry.setPassword(JSON.stringify(credential));
  }

  static async remove(credentialId) {
    const entry = new Entry(SERVICE_NAME, credentialId);

    try {
      entry.deletePassword();
    } catch (err) {
      const message = err?.message ?? String(err);

      if (!/not found|no entry|no matching/i.test(message)) {
        throw err;
      }
    }
  }
}
