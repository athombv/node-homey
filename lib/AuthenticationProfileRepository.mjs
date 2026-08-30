import { randomUUID } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';

import {
  assertCliStateIdentifier,
  cloneCliStateValue,
  DEFAULT_IDENTIFIER,
} from './CliStateModel.mjs';
import { evaluateAuthenticationProfileHealth } from './ContextHealthEvaluator.mjs';
import { CredentialLifecycleCoordinator } from './CredentialLifecycleCoordinator.mjs';
import { OperatingSystemCredentialStore } from './OperatingSystemCredentialStore.mjs';

export class AuthenticationProfileRepository {
  #state;

  constructor(state) {
    this.#state = state;
  }

  async listAuthenticationProfiles() {
    const state = await this.#state.read();
    const profilePromises = Object.entries(state.authenticationProfiles.profiles).map(
      async ([name, profile]) => {
        const health = await evaluateAuthenticationProfileHealth(profile, state.credentials, {
          hasLegacyAuthentication: state.legacy.hasAuthentication,
        });

        return {
          name,
          profile: cloneCliStateValue(profile),
          usable: health.usable,
          reason: health.reason,
          referencedBy: Object.entries(state.contextState.contexts)
            .filter(([, context]) => {
              return context.authenticationProfile === name;
            })
            .map(([contextName]) => {
              return contextName;
            }),
        };
      },
    );

    return await Promise.all(profilePromises);
  }

  async getAuthenticationProfile(name) {
    assertCliStateIdentifier(name, 'authentication profile name');
    const profiles = await this.listAuthenticationProfiles();

    return (
      profiles.find((profile) => {
        return profile.name === name;
      }) ?? null
    );
  }

  async saveAuthenticationProfile(name, profile) {
    assertCliStateIdentifier(name, 'authentication profile name');

    await this.#state.update((state) => {
      state.authenticationProfiles.profiles[name] = cloneCliStateValue(profile);
    });

    return await this.getAuthenticationProfile(name);
  }

  async createPatAuthenticationProfile(name, variable, metadata = {}, options = {}) {
    assertCliStateIdentifier(name, 'authentication profile name');

    if (typeof variable !== 'string' || variable.length === 0) {
      throw new Error('A PAT authentication profile requires an environment variable name.');
    }

    let previousSource = null;

    await this.#state.update((state, settings) => {
      const existingProfile = state.authenticationProfiles.profiles[name];

      if (existingProfile && !options.replace) {
        throw new Error(`Authentication profile already exists: ${name}`);
      }

      const existingAccountId = existingProfile?.accountId ?? null;
      const nextAccountId = metadata.accountId ?? null;
      const changesIdentity = Boolean(
        existingAccountId && nextAccountId && existingAccountId !== nextAccountId,
      );

      if (changesIdentity && !options.replaceAccount) {
        throw new Error(
          `Credentials resolve to a different Athom account. Re-run with --replace-account to replace ${existingAccountId}.`,
        );
      }

      previousSource = existingProfile?.credentialSource ?? null;
      state.authenticationProfiles.profiles[name] = {
        accountId: nextAccountId,
        email: metadata.email ?? null,
        displayName: metadata.displayName ?? null,
        credentialSource: {
          type: 'patEnvironment',
          variable,
        },
        authenticated: Boolean(metadata.accountId),
      };

      if (previousSource?.type === 'oauth' && !previousSource.legacy) {
        delete state.credentials.entries[previousSource.credentialId];
      }

      if (previousSource?.legacy) {
        settings.homeyApi = null;
      }
    });

    if (
      previousSource?.type === 'oauth' &&
      !previousSource.legacy &&
      previousSource.store === 'keychain'
    ) {
      await CredentialLifecycleCoordinator.removeKeychainCredentialAfterCommit(
        previousSource.credentialId,
        `Authentication profile ${name} PAT login`,
      );
    }

    return await this.getAuthenticationProfile(name);
  }

  async prepareOAuthAuthenticationProfile(name, store = 'settings') {
    assertCliStateIdentifier(name, 'authentication profile name');

    if (!['settings', 'keychain'].includes(store)) {
      throw new Error(`Unknown credential store: ${String(store)}`);
    }

    const credentialId = `cred_${randomUUID()}`;
    const source = {
      type: 'oauth',
      credentialId,
      store,
    };

    if (store === 'keychain') {
      await OperatingSystemCredentialStore.set(credentialId, {
        kind: 'oauth',
        value: {},
      });
    }

    try {
      await this.#state.update((state) => {
        state.credentials.entries[credentialId] =
          store === 'settings'
            ? {
                kind: 'oauth',
                value: {},
              }
            : {
                kind: 'oauth',
                store: 'keychain',
              };
      });
    } catch (err) {
      if (store === 'keychain') {
        await CredentialLifecycleCoordinator.removeStagedKeychainCredential(
          credentialId,
          `Authentication profile ${name} OAuth preparation`,
        );
      }

      throw err;
    }

    return source;
  }

  async completeOAuthAuthenticationProfile(name, source, metadata, options = {}) {
    assertCliStateIdentifier(name, 'authentication profile name');
    let previousSource = null;

    await this.#state.update((state, settings) => {
      const existingProfile = state.authenticationProfiles.profiles[name];
      const existingAccountId = existingProfile?.accountId;
      const changesIdentity = Boolean(
        existingAccountId && metadata.accountId && existingAccountId !== metadata.accountId,
      );

      if (changesIdentity && !options.replaceAccount) {
        throw new Error(
          `Credentials resolve to a different Athom account. Re-run with --replace-account to replace ${existingAccountId}.`,
        );
      }

      previousSource = existingProfile?.credentialSource ?? null;

      state.authenticationProfiles.profiles[name] = {
        accountId: metadata.accountId ?? null,
        email: metadata.email ?? null,
        displayName: metadata.displayName ?? null,
        credentialSource: source,
        authenticated: true,
      };

      if (previousSource?.type === 'oauth' && !previousSource.legacy) {
        delete state.credentials.entries[previousSource.credentialId];
      }

      if (previousSource?.legacy) {
        settings.homeyApi = null;
      }
    });

    let cleanupError = null;

    if (
      previousSource?.type === 'oauth' &&
      !previousSource.legacy &&
      previousSource.store === 'keychain'
    ) {
      cleanupError = await CredentialLifecycleCoordinator.tryRemoveKeychainCredential(
        previousSource.credentialId,
      );
    }

    let completedProfile;

    try {
      completedProfile = await this.getAuthenticationProfile(name);
    } catch (err) {
      const committedError = new Error(
        `Authentication profile ${name} was updated, but its saved state could not be read.`,
        { cause: err },
      );
      committedError.authenticationProfileCommitted = true;

      throw committedError;
    }

    return {
      ...completedProfile,
      cleanupError,
    };
  }

  async discardOAuthCredential(source) {
    if (source?.type !== 'oauth' || source.legacy) {
      return;
    }

    await this.#state.update((state) => {
      delete state.credentials.entries[source.credentialId];
    });

    if (source.store === 'keychain') {
      await CredentialLifecycleCoordinator.removeKeychainCredentialAfterCommit(
        source.credentialId,
        'Prepared OAuth credential discard',
      );
    }
  }

  async renameAuthenticationProfile(from, to) {
    assertCliStateIdentifier(from, 'authentication profile name');
    assertCliStateIdentifier(to, 'authentication profile name');

    await this.#state.update((state) => {
      const profile = state.authenticationProfiles.profiles[from];

      if (!profile) {
        throw new Error(`Authentication profile does not exist: ${from}`);
      }

      if (profile.credentialSource?.legacy) {
        throw new Error(
          `Legacy authentication profile ${from} must be migrated before it can be renamed.`,
        );
      }

      if (state.authenticationProfiles.profiles[to]) {
        throw new Error(`Authentication profile already exists: ${to}`);
      }

      state.authenticationProfiles.profiles[to] = profile;
      delete state.authenticationProfiles.profiles[from];

      for (const context of Object.values(state.contextState.contexts)) {
        if (context.authenticationProfile === from) {
          context.authenticationProfile = to;
        }
      }
    });

    return await this.getAuthenticationProfile(to);
  }

  async removeAuthenticationProfile(name) {
    assertCliStateIdentifier(name, 'authentication profile name');
    let removed;

    await this.#state.update((state, settings) => {
      removed = state.authenticationProfiles.profiles[name];

      if (!removed) {
        throw new Error(`Authentication profile does not exist: ${name}`);
      }

      delete state.authenticationProfiles.profiles[name];

      const source = removed.credentialSource;
      if (source?.type === 'oauth' && !source.legacy) {
        delete state.credentials.entries[source.credentialId];
      }

      if (name === DEFAULT_IDENTIFIER) {
        settings.homeyApi = null;
      }
    });

    const source = removed.credentialSource;

    if (source?.type === 'oauth' && !source.legacy && source.store === 'keychain') {
      await CredentialLifecycleCoordinator.removeKeychainCredentialAfterCommit(
        source.credentialId,
        `Authentication profile ${name} removal`,
      );
    }

    return cloneCliStateValue(removed);
  }

  async markAuthenticationProfileLoggedOut(name) {
    assertCliStateIdentifier(name, 'authentication profile name');

    await this.#state.update((state) => {
      const profile = state.authenticationProfiles.profiles[name];

      if (!profile) {
        throw new Error(`Authentication profile does not exist: ${name}`);
      }

      profile.authenticated = false;
    });
  }

  async migrateAuthenticationProfile(name, to, identityMetadata = null) {
    assertCliStateIdentifier(name, 'authentication profile name');

    if (!['settings', 'keychain'].includes(to)) {
      throw new Error(`Unknown credential store: ${String(to)}`);
    }

    const snapshot = await this.#state.readSnapshot();
    const { state } = snapshot;
    const profile = state.authenticationProfiles.profiles[name];

    if (!profile) {
      throw new Error(`Authentication profile does not exist: ${name}`);
    }

    const source = profile.credentialSource;

    if (source?.type !== 'oauth') {
      throw new Error('Only persistent OAuth authentication profiles can be migrated.');
    }

    if (!source.legacy && source.store === to) {
      return await this.getAuthenticationProfile(name);
    }

    let credential;

    if (source.legacy) {
      credential = {
        kind: 'oauth',
        value: cloneCliStateValue(snapshot.settings.homeyApi) ?? {},
      };
    } else if (source.store === 'settings') {
      credential = cloneCliStateValue(state.credentials.entries[source.credentialId]);
    } else {
      credential = await OperatingSystemCredentialStore.get(source.credentialId);
    }

    if (!credential) {
      throw new Error(`Stored credentials are missing for authentication profile ${name}.`);
    }

    const credentialId = `cred_${randomUUID()}`;

    if (to === 'keychain') {
      await OperatingSystemCredentialStore.set(credentialId, credential);
    }

    try {
      await this.#state.update((mutableState, settings) => {
        const mutableProfile = mutableState.authenticationProfiles.profiles[name];

        if (!mutableProfile) {
          throw new Error(`Authentication profile does not exist: ${name}`);
        }

        const credentialSourceChanged = !isDeepStrictEqual(mutableProfile.credentialSource, source);
        const accountIdentityChanged = mutableProfile.accountId !== profile.accountId;
        let credentialChanged = false;

        if (source.legacy) {
          credentialChanged = !isDeepStrictEqual(settings.homeyApi, snapshot.settings.homeyApi);
        } else if (source.store === 'settings') {
          credentialChanged = !isDeepStrictEqual(
            mutableState.credentials.entries[source.credentialId],
            credential,
          );
        }

        if (credentialSourceChanged || accountIdentityChanged || credentialChanged) {
          throw new Error(
            `Authentication profile ${name} changed while its credentials were being migrated. Retry the migration.`,
          );
        }

        mutableState.credentials.entries[credentialId] =
          to === 'settings'
            ? credential
            : {
                kind: 'oauth',
                store: 'keychain',
              };
        mutableProfile.credentialSource = {
          type: 'oauth',
          credentialId,
          store: to,
        };

        if (identityMetadata?.accountId) {
          if (mutableProfile.accountId && mutableProfile.accountId !== identityMetadata.accountId) {
            throw new Error(
              `Credentials resolve to a different Athom account: ${identityMetadata.accountId}.`,
            );
          }

          mutableProfile.accountId = identityMetadata.accountId;
          mutableProfile.email = identityMetadata.email ?? null;
          mutableProfile.displayName = identityMetadata.displayName ?? null;
          mutableProfile.authenticated = true;
        }

        if (!source.legacy) {
          delete mutableState.credentials.entries[source.credentialId];
        }

        if (source.legacy) {
          settings.homeyApi = null;
        }
      });
    } catch (err) {
      if (to === 'keychain') {
        await CredentialLifecycleCoordinator.removeStagedKeychainCredential(
          credentialId,
          `Authentication profile ${name} migration`,
        );
      }

      throw err;
    }

    if (!source.legacy && source.store === 'keychain') {
      await CredentialLifecycleCoordinator.removeKeychainCredentialAfterCommit(
        source.credentialId,
        `Authentication profile ${name} migration`,
      );
    }

    return await this.getAuthenticationProfile(name);
  }
}
