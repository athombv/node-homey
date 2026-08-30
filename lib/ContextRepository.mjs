import { randomUUID } from 'node:crypto';

import {
  assertCliStateIdentifier,
  cloneCliStateValue,
  DEFAULT_DISCOVERY_STRATEGIES,
  DEFAULT_IDENTIFIER,
  normalizeCliContext,
} from './CliStateModel.mjs';
import { evaluateContextHealth } from './ContextHealthEvaluator.mjs';
import { CredentialLifecycleCoordinator } from './CredentialLifecycleCoordinator.mjs';
import { OperatingSystemCredentialStore } from './OperatingSystemCredentialStore.mjs';

export class ContextRepository {
  #state;

  constructor(state) {
    this.#state = state;
  }

  async listContexts() {
    const state = await this.#state.read();
    const contextPromises = Object.entries(state.contextState.contexts).map(
      async ([name, context]) => {
        const health = await evaluateContextHealth(context, state, {
          hasLegacyAuthentication: state.legacy.hasAuthentication,
        });

        return {
          name,
          current: state.contextState.current === name,
          context: cloneCliStateValue(context),
          health,
        };
      },
    );

    return await Promise.all(contextPromises);
  }

  async getDefaultCredentialStore() {
    const state = await this.#state.read();

    return state.credentials.defaultStore ?? 'settings';
  }

  async setDefaultCredentialStore(store) {
    if (!['settings', 'keychain'].includes(store)) {
      throw new Error(`Unknown credential store: ${String(store)}`);
    }

    await this.#state.update((state) => {
      state.credentials.defaultStore = store;
    });

    return store;
  }

  async getContext(name) {
    assertCliStateIdentifier(name, 'context name');
    const state = await this.#state.read();
    const context = state.contextState.contexts[name];

    if (!context) {
      return null;
    }

    const health = await evaluateContextHealth(context, state, {
      hasLegacyAuthentication: state.legacy.hasAuthentication,
    });

    return {
      name,
      context: cloneCliStateValue(context),
      current: state.contextState.current === name,
      health,
    };
  }

  async createContext(name, context, options = {}) {
    assertCliStateIdentifier(name, 'context name');
    const credentialId = options.directToken ? `cred_${randomUUID()}` : null;
    const contextWithAuthentication = cloneCliStateValue(context);

    if (credentialId) {
      contextWithAuthentication.homeyAuthentication = {
        source: 'stored',
        credentialId,
        store: options.store ?? 'settings',
      };
    }

    const normalizedContext = normalizeCliContext(contextWithAuthentication);
    const store = options.store ?? 'settings';
    const existing = await this.getContext(name);

    if (existing) {
      throw new Error(`Context already exists: ${name}`);
    }

    if (credentialId && store === 'keychain') {
      await OperatingSystemCredentialStore.set(credentialId, {
        kind: 'homeyToken',
        value: options.directToken,
      });
    }

    try {
      await this.#state.update((state, settings) => {
        if (state.contextState.contexts[name]) {
          throw new Error(`Context already exists: ${name}`);
        }

        if (credentialId) {
          state.credentials.entries[credentialId] =
            store === 'settings'
              ? {
                  kind: 'homeyToken',
                  value: options.directToken,
                }
              : {
                  kind: 'homeyToken',
                  store: 'keychain',
                };
        }

        state.contextState.contexts[name] = normalizedContext;

        if (options.use) {
          state.contextState.current = name;
          settings.activeHomey = normalizedContext.target.homeyId
            ? {
                id: normalizedContext.target.homeyId,
                name: normalizedContext.target.name ?? null,
                platform: normalizedContext.target.platform ?? null,
              }
            : null;
        }
      });
    } catch (err) {
      if (credentialId && store === 'keychain') {
        await CredentialLifecycleCoordinator.removeStagedKeychainCredential(
          credentialId,
          `Context ${name} creation`,
        );
      }

      throw err;
    }

    return await this.getContext(name);
  }

  async updateContext(name, updater, options = {}) {
    assertCliStateIdentifier(name, 'context name');
    const directToken = options.directToken ?? null;
    const replacesDirectToken = directToken !== null;
    const store = options.store ?? 'settings';
    const credentialId = replacesDirectToken ? `cred_${randomUUID()}` : null;
    let removedKeychainCredentialId = null;

    if (replacesDirectToken && !['settings', 'keychain'].includes(store)) {
      throw new Error(`Unknown credential store: ${String(store)}`);
    }

    if (replacesDirectToken && store === 'keychain') {
      await OperatingSystemCredentialStore.set(credentialId, {
        kind: 'homeyToken',
        value: directToken,
      });
    }

    try {
      await this.#state.update((state, settings) => {
        const existing = state.contextState.contexts[name];

        if (!existing) {
          throw new Error(`Context does not exist: ${name}`);
        }

        const updated = updater(cloneCliStateValue(existing));

        if (replacesDirectToken) {
          updated.homeyAuthentication = {
            source: 'stored',
            credentialId,
            store,
          };
        }

        const normalized = normalizeCliContext(updated);
        const previousAuthentication = existing.homeyAuthentication;
        const nextAuthentication = normalized.homeyAuthentication;
        const replacedStoredCredential =
          previousAuthentication?.source === 'stored' &&
          previousAuthentication.credentialId !== nextAuthentication?.credentialId;

        if (replacedStoredCredential) {
          delete state.credentials.entries[previousAuthentication.credentialId];
        }

        if (replacedStoredCredential && previousAuthentication.store === 'keychain') {
          removedKeychainCredentialId = previousAuthentication.credentialId;
        }

        if (replacesDirectToken) {
          state.credentials.entries[credentialId] =
            store === 'settings'
              ? {
                  kind: 'homeyToken',
                  value: directToken,
                }
              : {
                  kind: 'homeyToken',
                  store: 'keychain',
                };
        }

        state.contextState.contexts[name] = normalized;

        if (state.contextState.current === name) {
          const target = state.contextState.contexts[name].target;
          settings.activeHomey = target.homeyId
            ? {
                id: target.homeyId,
                name: target.name ?? null,
                platform: target.platform ?? null,
              }
            : null;
        }
      });
    } catch (err) {
      if (replacesDirectToken && store === 'keychain') {
        await CredentialLifecycleCoordinator.removeStagedKeychainCredential(
          credentialId,
          `Context ${name} update`,
        );
      }

      throw err;
    }

    if (removedKeychainCredentialId) {
      await CredentialLifecycleCoordinator.removeKeychainCredentialAfterCommit(
        removedKeychainCredentialId,
        `Context ${name} update`,
      );
    }

    return await this.getContext(name);
  }

  async replaceContextDirectToken(name, token, store = 'settings') {
    return await this.updateContext(
      name,
      (context) => {
        return context;
      },
      { directToken: token, store },
    );
  }

  async useContext(name) {
    assertCliStateIdentifier(name, 'context name');

    await this.#state.update((state, settings) => {
      const context = state.contextState.contexts[name];

      if (!context) {
        throw new Error(`Context does not exist: ${name}`);
      }

      state.contextState.current = name;
      settings.activeHomey = context.target.homeyId
        ? {
            id: context.target.homeyId,
            name: context.target.name ?? null,
            platform: context.target.platform ?? null,
          }
        : null;
    });

    return await this.getContext(name);
  }

  async clearCurrentContext() {
    await this.#state.update((state, settings) => {
      state.contextState.current = null;
      settings.activeHomey = null;
    });
  }

  async renameContext(from, to) {
    assertCliStateIdentifier(from, 'context name');
    assertCliStateIdentifier(to, 'context name');

    await this.#state.update((state) => {
      const context = state.contextState.contexts[from];

      if (!context) {
        throw new Error(`Context does not exist: ${from}`);
      }

      if (state.contextState.contexts[to]) {
        throw new Error(`Context already exists: ${to}`);
      }

      state.contextState.contexts[to] = context;
      delete state.contextState.contexts[from];

      if (state.contextState.current === from) {
        state.contextState.current = to;
      }
    });

    return await this.getContext(to);
  }

  async removeContext(name) {
    assertCliStateIdentifier(name, 'context name');
    let removed;
    let removedKeychainCredentialId = null;

    await this.#state.update((state, settings) => {
      removed = state.contextState.contexts[name];
      if (!removed) {
        throw new Error(`Context does not exist: ${name}`);
      }

      delete state.contextState.contexts[name];

      const authentication = removed.homeyAuthentication;

      if (authentication?.source === 'stored') {
        delete state.credentials.entries[authentication.credentialId];
      }

      if (authentication?.source === 'stored' && authentication.store === 'keychain') {
        removedKeychainCredentialId = authentication.credentialId;
      }

      if (state.contextState.current === name) {
        settings.activeHomey = null;
      }
    });

    if (removedKeychainCredentialId) {
      await CredentialLifecycleCoordinator.removeKeychainCredentialAfterCommit(
        removedKeychainCredentialId,
        `Context ${name} removal`,
      );
    }

    return cloneCliStateValue(removed);
  }

  async setLegacySelection(target) {
    const context = normalizeCliContext({
      target: {
        homeyId: target.id,
        name: target.name,
        platform: target.platform,
      },
      authenticationProfile: DEFAULT_IDENTIFIER,
      route: {
        type: 'discovery',
        strategies: target.platform === 'cloud' ? ['cloud'] : [...DEFAULT_DISCOVERY_STRATEGIES],
      },
    });

    await this.#state.update((state, settings) => {
      state.contextState.contexts[DEFAULT_IDENTIFIER] = context;
      state.contextState.current = DEFAULT_IDENTIFIER;
      settings.activeHomey = {
        id: target.id,
        name: target.name,
        platform: target.platform,
      };
    });
  }

  async getSelectedTarget() {
    const state = await this.#state.read();
    const currentName = state.contextState.current;

    if (!currentName) {
      return null;
    }

    const context = state.contextState.contexts[currentName];

    if (!context) {
      throw new Error(
        `Current context "${currentName}" does not exist. Run \`homey context use <name>\` or \`homey unselect\`.`,
      );
    }

    const target = context.target;

    return {
      id: target.homeyId ?? null,
      name: target.name ?? null,
      platform: target.platform ?? null,
    };
  }

  async resolveDirectToken(selection) {
    const authentication = selection?.context.homeyAuthentication;

    if (!authentication) {
      return null;
    }

    if (authentication.source === 'environment') {
      return process.env[authentication.variable] || null;
    }

    if (authentication.store === 'keychain') {
      const credential = await OperatingSystemCredentialStore.get(authentication.credentialId);

      return credential?.value ?? null;
    }

    return selection.state.credentials.entries[authentication.credentialId]?.value ?? null;
  }

  async resolveContextSelection(explicitName) {
    const state = await this.#state.read();
    let name = null;
    let source = null;

    if (explicitName !== undefined) {
      name = explicitName;
      source = 'argument';
    } else if (process.env.HOMEY_CONTEXT !== undefined) {
      name = process.env.HOMEY_CONTEXT;
      source = 'environment';
    } else if (state.contextState.current) {
      name = state.contextState.current;
      source = 'current';
    } else {
      return null;
    }

    assertCliStateIdentifier(name, 'context name');
    const context = state.contextState.contexts[name];

    if (!context) {
      const error = new Error(
        `Selected context "${name}" from ${source} does not exist. Run \`homey context ls\` and select a valid context.`,
      );

      error.selectionSource = source;
      throw error;
    }

    const health = await evaluateContextHealth(context, state, {
      hasLegacyAuthentication: state.legacy.hasAuthentication,
    });

    return {
      name,
      source,
      context: cloneCliStateValue(context),
      health,
      state,
    };
  }

  async evaluateContextHealth(context, state, requiredCapability = null) {
    return await evaluateContextHealth(
      context,
      state,
      {
        hasLegacyAuthentication: state.legacy?.hasAuthentication ?? false,
      },
      requiredCapability,
    );
  }
}
