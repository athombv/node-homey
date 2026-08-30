import AthomApi from './AthomApi.js';
import AthomApiStorage from './AthomApiStorage.js';
import LegacyAthomApi from '../services/AthomApi.js';
import { CliState } from '../services/CliState.mjs';

function toAccountMetadata(profile) {
  const names = [profile.firstname, profile.lastname].filter((value) => {
    return typeof value === 'string' && value.length > 0;
  });

  return {
    accountId: profile.id ?? null,
    email: profile.email ?? null,
    displayName: names.length > 0 ? names.join(' ') : null,
  };
}

function toVerifiedAccountMetadata(profile) {
  const metadata = toAccountMetadata(profile);

  if (!metadata.accountId) {
    throw new Error('Athom Cloud did not return a canonical account ID.');
  }

  return metadata;
}

export class AuthenticationProfileRegistry {
  constructor() {
    this._clients = new Map();
  }

  async resolveProfileName({ explicitProfile, contextName } = {}) {
    if (explicitProfile) {
      return explicitProfile;
    }

    const selection = await CliState.resolveContextSelection(contextName);

    return selection?.context.authenticationProfile ?? 'default';
  }

  async getClient(
    name,
    { allowInteractiveLogin = false, fresh = false, verifyIdentity = true } = {},
  ) {
    const profileEntry = await CliState.getAuthenticationProfile(name);

    if (!profileEntry) {
      if (name === 'default') {
        return LegacyAthomApi;
      }

      throw new Error(`Authentication profile does not exist: ${name}`);
    }

    const source = profileEntry.profile.credentialSource;

    if (source?.legacy) {
      return LegacyAthomApi;
    }

    if (!fresh && this._clients.has(name)) {
      return this._clients.get(name);
    }

    let personalAccessToken = null;
    let storage = null;

    if (source?.type === 'patEnvironment') {
      personalAccessToken = process.env[source.variable];

      if (!personalAccessToken) {
        throw new Error(`Environment variable ${source.variable} is not set.`);
      }
    } else if (source?.type === 'oauth' && source.store === 'settings') {
      storage = new AthomApiStorage({
        credentialId: source.credentialId,
        legacy: false,
        store: source.store,
      });
    } else if (source?.type === 'oauth' && source.store === 'keychain') {
      storage = new AthomApiStorage({
        credentialId: source.credentialId,
        legacy: false,
        store: source.store,
      });
    } else {
      throw new Error(`Authentication profile ${name} has no supported credential source.`);
    }

    const client = new AthomApi({
      storage,
      personalAccessToken,
      allowInteractiveLogin,
      clearSelectionOnLogout: false,
      migrateLegacyAuthentication: false,
      useLegacyPersonalAccessToken: false,
      diagnosticOutput: process.stderr,
    });

    if (verifyIdentity && profileEntry.profile.accountId) {
      const authenticatedProfile = await client.getProfile();
      const authenticatedAccountId = authenticatedProfile.id ?? null;

      if (authenticatedAccountId !== profileEntry.profile.accountId) {
        throw new Error(
          `Authentication profile ${name} resolved to account ${authenticatedAccountId ?? 'unknown'}, expected ${profileEntry.profile.accountId}. Run \`homey auth login ${name} --replace-account\` to replace its identity.`,
        );
      }
    }

    if (!fresh) {
      this._clients.set(name, client);
    }

    return client;
  }

  async listUsableClients() {
    const profiles = await CliState.listAuthenticationProfiles();
    const clientPromises = profiles
      .filter((entry) => {
        return entry.usable;
      })
      .map(async (entry) => {
        const client = await this.getClient(entry.name, {
          allowInteractiveLogin: false,
        });

        return {
          name: entry.name,
          client,
        };
      });

    return await Promise.all(clientPromises);
  }

  async loginWithPat(name, variable, { replaceAccount = false } = {}) {
    const token = process.env[variable];

    if (!token) {
      throw new Error(`Environment variable ${variable} is not set.`);
    }

    const client = new AthomApi({
      personalAccessToken: token,
      allowInteractiveLogin: false,
      clearSelectionOnLogout: false,
      migrateLegacyAuthentication: false,
      diagnosticOutput: process.stderr,
    });
    const profile = await client.getProfile();
    const metadata = toVerifiedAccountMetadata(profile);

    await CliState.createPatAuthenticationProfile(name, variable, metadata, {
      replace: true,
      replaceAccount,
    });
    this._clients.set(name, client);

    return profile;
  }

  async loginWithOAuth(name, { store = 'settings', replaceAccount = false } = {}) {
    const source = await CliState.prepareOAuthAuthenticationProfile(name, store);
    const storage = new AthomApiStorage({
      credentialId: source.credentialId,
      legacy: false,
      store: source.store,
    });
    const client = new AthomApi({
      storage,
      allowInteractiveLogin: true,
      clearSelectionOnLogout: false,
      migrateLegacyAuthentication: false,
      useLegacyPersonalAccessToken: false,
      diagnosticOutput: process.stderr,
    });

    try {
      await client.login();
      const profile = await client.getProfile();
      const metadata = toVerifiedAccountMetadata(profile);

      const completedProfile = await CliState.completeOAuthAuthenticationProfile(
        name,
        source,
        metadata,
        {
          replaceAccount,
        },
      );

      if (completedProfile?.cleanupError) {
        const message =
          completedProfile.cleanupError?.message ?? String(completedProfile.cleanupError);

        console.error(
          `Warning: authentication profile ${name} was updated, but its previous keychain credential could not be removed: ${message}`,
        );
      }

      this._clients.set(name, client);

      return profile;
    } catch (err) {
      if (!err?.authenticationProfileCommitted) {
        await CliState.discardOAuthCredential(source);
      }

      throw err;
    }
  }

  async migrateAuthenticationProfile(name, to) {
    const profileEntry = await CliState.getAuthenticationProfile(name);
    let identityMetadata = null;
    let identityError = null;

    if (
      profileEntry?.profile.credentialSource?.type === 'oauth' &&
      !profileEntry.profile.accountId
    ) {
      try {
        const source = profileEntry.profile.credentialSource;
        let client;

        if (source.legacy) {
          client = new AthomApi({
            storage: new AthomApiStorage({ legacy: true, store: 'settings' }),
            allowInteractiveLogin: false,
            clearSelectionOnLogout: false,
            migrateLegacyAuthentication: false,
            useLegacyPersonalAccessToken: false,
            diagnosticOutput: process.stderr,
          });
        } else {
          client = await this.getClient(name, {
            allowInteractiveLogin: false,
            fresh: true,
          });
        }

        const authenticatedProfile = await client.getProfile();
        const resolvedIdentity = toVerifiedAccountMetadata(authenticatedProfile);

        identityMetadata = resolvedIdentity;
      } catch (err) {
        identityError = err;
      }
    }

    const profile = await CliState.migrateAuthenticationProfile(name, to, identityMetadata);
    this._clients.delete(name);

    return { profile, identityError };
  }

  async logout(name) {
    const profileEntry = await CliState.getAuthenticationProfile(name);

    if (!profileEntry) {
      throw new Error(`Authentication profile does not exist: ${name}`);
    }

    if (profileEntry.profile.credentialSource?.type === 'patEnvironment') {
      const variable = profileEntry.profile.credentialSource.variable;

      throw new Error(
        `Authentication profile ${name} reads its PAT from ${variable}. Unset that variable or remove the profile.`,
      );
    }

    let client;

    if (profileEntry.profile.credentialSource?.legacy) {
      client = new AthomApi({
        allowInteractiveLogin: false,
        clearSelectionOnLogout: false,
        diagnosticOutput: process.stderr,
      });
    } else {
      client = await this.getClient(name, {
        allowInteractiveLogin: false,
        fresh: true,
        verifyIdentity: false,
      });
    }

    await client.logout();
    await CliState.markAuthenticationProfileLoggedOut(name);
    this._clients.delete(name);
  }
}
