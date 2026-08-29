'use strict';

const { randomUUID } = require('node:crypto');

const Settings = require('../services/Settings');
const { OperatingSystemCredentialStore } = require('./OperatingSystemCredentialStore');

const CONTEXT_SCHEMA_VERSION = 1;
const AUTHENTICATION_SCHEMA_VERSION = 1;
const CREDENTIAL_SCHEMA_VERSION = 1;
const DEFAULT_IDENTIFIER = 'default';
const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const DISCOVERY_STRATEGIES = new Set(['mdns', 'cloud', 'local', 'localSecure', 'remoteForwarded']);
const DEFAULT_DISCOVERY_STRATEGIES = ['localSecure', 'local', 'remoteForwarded', 'cloud'];

function clone(value) {
  if (typeof value === 'undefined') {
    return undefined;
  }

  return structuredClone(value);
}

function createEmptyContextState() {
  return {
    schemaVersion: CONTEXT_SCHEMA_VERSION,
    current: null,
    contexts: {},
  };
}

function createEmptyAuthenticationProfiles() {
  return {
    schemaVersion: AUTHENTICATION_SCHEMA_VERSION,
    profiles: {},
  };
}

function createEmptyCredentials() {
  return {
    schemaVersion: CREDENTIAL_SCHEMA_VERSION,
    defaultStore: 'settings',
    entries: {},
  };
}

function assertSupportedSchema(namespace, state, expectedVersion) {
  if (!state || typeof state !== 'object') {
    return;
  }

  if (state.schemaVersion === expectedVersion) {
    return;
  }

  throw new Error(
    `Unsupported ${namespace} schema version: ${String(state.schemaVersion)}. Please update Homey CLI.`,
  );
}

function getStoredNamespaces(settings) {
  assertSupportedSchema('context state', settings.contextState, CONTEXT_SCHEMA_VERSION);
  assertSupportedSchema(
    'authentication profiles',
    settings.authenticationProfiles,
    AUTHENTICATION_SCHEMA_VERSION,
  );
  assertSupportedSchema('credentials', settings.credentials, CREDENTIAL_SCHEMA_VERSION);

  return {
    contextState: clone(settings.contextState) ?? createEmptyContextState(),
    authenticationProfiles:
      clone(settings.authenticationProfiles) ?? createEmptyAuthenticationProfiles(),
    credentials: clone(settings.credentials) ?? createEmptyCredentials(),
  };
}

function createLegacyDefaultContext(activeHomey) {
  const strategies =
    activeHomey.platform === 'cloud' ? ['cloud'] : [...DEFAULT_DISCOVERY_STRATEGIES];

  return {
    target: {
      homeyId: activeHomey.id,
      name: activeHomey.name ?? null,
      platform: activeHomey.platform ?? null,
    },
    authenticationProfile: DEFAULT_IDENTIFIER,
    route: {
      type: 'discovery',
      strategies,
    },
  };
}

function createLegacyDefaultProfile(hasLegacyAuthentication) {
  return {
    accountId: null,
    email: null,
    displayName: null,
    credentialSource: {
      type: 'oauth',
      credentialId: 'legacy-homey-api',
      store: 'settings',
      legacy: true,
    },
    authenticated: hasLegacyAuthentication,
  };
}

function applyLegacyViews(namespaces, settings) {
  const { contextState, authenticationProfiles } = namespaces;
  const hasLegacyHomey = settings.activeHomey && typeof settings.activeHomey.id === 'string';
  const hasLegacyAuthentication = Boolean(settings.homeyApi);

  if (!contextState.contexts[DEFAULT_IDENTIFIER] && hasLegacyHomey) {
    contextState.contexts[DEFAULT_IDENTIFIER] = createLegacyDefaultContext(settings.activeHomey);
  }

  if (!contextState.current && hasLegacyHomey) {
    contextState.current = DEFAULT_IDENTIFIER;
  }

  const defaultContextReferencesProfile =
    contextState.contexts[DEFAULT_IDENTIFIER]?.authenticationProfile === DEFAULT_IDENTIFIER;
  if (!authenticationProfiles.profiles[DEFAULT_IDENTIFIER] && defaultContextReferencesProfile) {
    authenticationProfiles.profiles[DEFAULT_IDENTIFIER] =
      createLegacyDefaultProfile(hasLegacyAuthentication);
  }

  if (!authenticationProfiles.profiles[DEFAULT_IDENTIFIER] && hasLegacyAuthentication) {
    authenticationProfiles.profiles[DEFAULT_IDENTIFIER] =
      createLegacyDefaultProfile(hasLegacyAuthentication);
  }

  return namespaces;
}

function materializeNamespaces(settings) {
  const namespaces = applyLegacyViews(getStoredNamespaces(settings), settings);

  settings.contextState = namespaces.contextState;
  settings.authenticationProfiles = namespaces.authenticationProfiles;
  settings.credentials = namespaces.credentials;

  return namespaces;
}

function assertIdentifier(identifier, label = 'identifier') {
  if (typeof identifier !== 'string' || !IDENTIFIER_PATTERN.test(identifier)) {
    throw new Error(
      `Invalid ${label} "${String(identifier)}". Use 1-64 lowercase letters, numbers, dots, underscores, or hyphens.`,
    );
  }
}

function normalizeTarget(target = {}) {
  const normalized = {};

  if (typeof target.homeyId === 'string' && target.homeyId.length > 0) {
    normalized.homeyId = target.homeyId;
  }

  if (typeof target.name === 'string' && target.name.length > 0) {
    normalized.name = target.name;
  }

  if (typeof target.platform === 'string' && target.platform.length > 0) {
    normalized.platform = target.platform;
  }

  return normalized;
}

function normalizeDiscoveryStrategies(strategies) {
  if (!Array.isArray(strategies) || strategies.length === 0) {
    throw new Error('A discovery route requires at least one strategy.');
  }

  const normalized = [];

  for (const strategy of strategies) {
    if (!DISCOVERY_STRATEGIES.has(strategy)) {
      throw new Error(`Unknown Homey discovery strategy: ${String(strategy)}`);
    }

    if (!normalized.includes(strategy)) {
      normalized.push(strategy);
    }
  }

  return normalized;
}

function normalizeRoute(route, target) {
  const candidate = route ?? {
    type: 'discovery',
    strategies: target.platform === 'cloud' ? ['cloud'] : [...DEFAULT_DISCOVERY_STRATEGIES],
  };

  if (candidate.type === 'discovery') {
    return {
      type: 'discovery',
      strategies: normalizeDiscoveryStrategies(candidate.strategies),
    };
  }

  if (candidate.type === 'usb') {
    return { type: 'usb' };
  }

  if (candidate.type === 'address') {
    let parsedAddress;

    try {
      parsedAddress = new URL(candidate.address);
    } catch {
      throw new Error('Invalid context address. Provide an absolute HTTP or HTTPS URL.');
    }

    if (!['http:', 'https:'].includes(parsedAddress.protocol)) {
      throw new Error('Invalid context address. Only HTTP and HTTPS URLs are supported.');
    }

    return {
      type: 'address',
      address: String(candidate.address).replace(/\/+$/, ''),
    };
  }

  throw new Error(`Unknown context route type: ${String(candidate.type)}`);
}

function normalizeHomeyAuthentication(authentication) {
  if (!authentication) {
    return null;
  }

  if (authentication.source === 'environment') {
    if (typeof authentication.variable !== 'string' || authentication.variable.length === 0) {
      throw new Error('Environment-backed Homey authentication requires a variable name.');
    }

    return {
      source: 'environment',
      variable: authentication.variable,
    };
  }

  if (authentication.source === 'stored') {
    if (
      typeof authentication.credentialId !== 'string' ||
      authentication.credentialId.length === 0
    ) {
      throw new Error('Stored Homey authentication requires a credential ID.');
    }

    if (!['settings', 'keychain'].includes(authentication.store)) {
      throw new Error(`Unknown credential store: ${String(authentication.store)}`);
    }

    return {
      source: 'stored',
      credentialId: authentication.credentialId,
      store: authentication.store,
    };
  }

  throw new Error(`Unknown Homey credential source: ${String(authentication.source)}`);
}

function normalizeContext(context) {
  const target = normalizeTarget(context.target);
  const route = normalizeRoute(context.route, target);
  const homeyAuthentication = normalizeHomeyAuthentication(context.homeyAuthentication);
  const authenticationProfile = context.authenticationProfile ?? null;

  if (authenticationProfile !== null) {
    assertIdentifier(authenticationProfile, 'authentication profile');
  }

  const hasAccountAuthentication = authenticationProfile !== null;
  const hasDirectAuthentication = homeyAuthentication !== null;

  if (!hasAccountAuthentication && !hasDirectAuthentication) {
    throw new Error('A context requires an authentication profile or direct Homey authentication.');
  }

  if (hasAccountAuthentication && !target.homeyId) {
    throw new Error('Account-backed contexts require --homey-id.');
  }

  if (hasDirectAuthentication && !hasAccountAuthentication && route.type !== 'address') {
    throw new Error('Direct-only contexts require an explicit --address route.');
  }

  const normalized = {
    target,
    route,
  };

  if (typeof context.description === 'string' && context.description.length > 0) {
    normalized.description = context.description;
  }

  if (authenticationProfile !== null) {
    normalized.authenticationProfile = authenticationProfile;
  }

  if (homeyAuthentication !== null) {
    normalized.homeyAuthentication = homeyAuthentication;
  }

  return normalized;
}

function isCredentialEntryUsable(credentials, credentialId) {
  const entry = credentials.entries[credentialId];

  if (!entry || typeof entry !== 'object') {
    return false;
  }

  if (entry.kind === 'homeyToken') {
    return typeof entry.value === 'string' && entry.value.length > 0;
  }

  if (entry.kind === 'oauth') {
    return Boolean(entry.value?.token?.access_token);
  }

  return false;
}

function evaluateAuthenticationProfile(profile, credentials, settings) {
  if (!profile) {
    return {
      usable: false,
      reason: 'Authentication profile does not exist.',
    };
  }

  const source = profile.credentialSource;

  if (!source) {
    return {
      usable: false,
      reason: 'Authentication profile has no credential source.',
    };
  }

  if (profile.authenticated === false) {
    return {
      usable: false,
      reason: 'Authentication profile is logged out.',
    };
  }

  if (source.type === 'patEnvironment') {
    const value = process.env[source.variable];

    return value
      ? { usable: true, reason: null }
      : { usable: false, reason: `Environment variable ${source.variable} is not set.` };
  }

  if (source.type !== 'oauth') {
    return {
      usable: false,
      reason: `Unknown authentication source: ${String(source.type)}`,
    };
  }

  if (source.legacy) {
    return settings.homeyApi
      ? { usable: true, reason: null }
      : { usable: false, reason: 'The legacy default login has no stored credentials.' };
  }

  if (source.store === 'keychain') {
    return {
      usable: true,
      reason: null,
    };
  }

  return isCredentialEntryUsable(credentials, source.credentialId)
    ? { usable: true, reason: null }
    : { usable: false, reason: 'Stored account credentials are missing.' };
}

function evaluateDirectAuthentication(authentication, credentials) {
  if (!authentication) {
    return {
      configured: false,
      usable: false,
      reason: null,
    };
  }

  if (authentication.source === 'environment') {
    const value = process.env[authentication.variable];

    return value
      ? { configured: true, usable: true, reason: null }
      : {
          configured: true,
          usable: false,
          reason: `Environment variable ${authentication.variable} is not set.`,
        };
  }

  if (authentication.store === 'keychain') {
    return {
      configured: true,
      usable: true,
      reason: null,
    };
  }

  return isCredentialEntryUsable(credentials, authentication.credentialId)
    ? { configured: true, usable: true, reason: null }
    : { configured: true, usable: false, reason: 'Stored Homey credentials are missing.' };
}

function evaluateContextHealth(context, namespaces, settings, requiredCapability = null) {
  const reasons = [];
  const profile = context.authenticationProfile
    ? namespaces.authenticationProfiles.profiles[context.authenticationProfile]
    : null;
  const account = context.authenticationProfile
    ? evaluateAuthenticationProfile(profile, namespaces.credentials, settings)
    : { usable: false, reason: null };
  const homey = evaluateDirectAuthentication(context.homeyAuthentication, namespaces.credentials);

  if (context.authenticationProfile && !account.usable) {
    reasons.push(`Account authentication: ${account.reason}`);
  }

  if (homey.configured && !homey.usable) {
    reasons.push(`Direct Homey authentication: ${homey.reason}`);
  }

  const capabilities = {
    account: account.usable,
    homey: homey.usable,
  };
  let requiredCapabilityUsable = account.usable || homey.usable;

  if (requiredCapability === 'account') {
    requiredCapabilityUsable = account.usable;
  }

  if (requiredCapability === 'homey') {
    requiredCapabilityUsable = account.usable || homey.usable;
  }

  let status = 'ready';

  if (!requiredCapabilityUsable) {
    status = 'unusable';
  } else if (reasons.length > 0) {
    status = 'degraded';
  }

  return {
    status,
    capabilities,
    reasons,
  };
}

class CliStateRepository {
  async read() {
    const [contextState, authenticationProfiles, credentials, activeHomey, homeyApi] =
      await Promise.all([
        Settings.get('contextState'),
        Settings.get('authenticationProfiles'),
        Settings.get('credentials'),
        Settings.get('activeHomey'),
        Settings.get('homeyApi'),
      ]);
    const settings = {
      contextState,
      authenticationProfiles,
      credentials,
      activeHomey,
      homeyApi,
    };
    const namespaces = applyLegacyViews(getStoredNamespaces(settings), settings);

    return {
      ...namespaces,
      legacy: {
        activeHomey: clone(activeHomey),
        hasAuthentication: Boolean(homeyApi),
      },
    };
  }

  async listContexts() {
    const state = await this.read();

    return Object.entries(state.contextState.contexts).map(([name, context]) => {
      return {
        name,
        current: state.contextState.current === name,
        context: clone(context),
        health: evaluateContextHealth(context, state, {
          homeyApi: state.legacy.hasAuthentication ? {} : null,
        }),
      };
    });
  }

  async getDefaultCredentialStore() {
    const state = await this.read();

    return state.credentials.defaultStore ?? 'settings';
  }

  async setDefaultCredentialStore(store) {
    if (!['settings', 'keychain'].includes(store)) {
      throw new Error(`Unknown credential store: ${String(store)}`);
    }

    await Settings.update((settings) => {
      const state = materializeNamespaces(settings);

      state.credentials.defaultStore = store;
    });

    return store;
  }

  async getContext(name) {
    assertIdentifier(name, 'context name');
    const state = await this.read();
    const context = state.contextState.contexts[name];

    if (!context) {
      return null;
    }

    return {
      name,
      context: clone(context),
      current: state.contextState.current === name,
      health: evaluateContextHealth(context, state, {
        homeyApi: state.legacy.hasAuthentication ? {} : null,
      }),
    };
  }

  async createContext(name, context, options = {}) {
    assertIdentifier(name, 'context name');
    const credentialId = options.directToken ? `cred_${randomUUID()}` : null;
    const contextWithAuthentication = clone(context);

    if (credentialId) {
      contextWithAuthentication.homeyAuthentication = {
        source: 'stored',
        credentialId,
        store: options.store ?? 'settings',
      };
    }

    const normalizedContext = normalizeContext(contextWithAuthentication);
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
      await Settings.update((settings) => {
        const state = materializeNamespaces(settings);

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
        await OperatingSystemCredentialStore.remove(credentialId);
      }

      throw err;
    }

    return this.getContext(name);
  }

  async updateContext(name, updater, options = {}) {
    assertIdentifier(name, 'context name');
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
      await Settings.update((settings) => {
        const state = materializeNamespaces(settings);
        const existing = state.contextState.contexts[name];

        if (!existing) {
          throw new Error(`Context does not exist: ${name}`);
        }

        const updated = updater(clone(existing));

        if (replacesDirectToken) {
          updated.homeyAuthentication = {
            source: 'stored',
            credentialId,
            store,
          };
        }

        const normalized = normalizeContext(updated);
        const previousAuthentication = existing.homeyAuthentication;
        const nextAuthentication = normalized.homeyAuthentication;
        const replacedStoredCredential =
          previousAuthentication?.source === 'stored' &&
          previousAuthentication.credentialId !== nextAuthentication?.credentialId;

        if (replacedStoredCredential && previousAuthentication.store === 'settings') {
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
        await OperatingSystemCredentialStore.remove(credentialId);
      }

      throw err;
    }

    if (removedKeychainCredentialId) {
      await OperatingSystemCredentialStore.remove(removedKeychainCredentialId);
    }

    return this.getContext(name);
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
    assertIdentifier(name, 'context name');

    await Settings.update((settings) => {
      const state = materializeNamespaces(settings);
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

    return this.getContext(name);
  }

  async clearCurrentContext() {
    await Settings.update((settings) => {
      const state = materializeNamespaces(settings);

      state.contextState.current = null;
      settings.activeHomey = null;
    });
  }

  async renameContext(from, to) {
    assertIdentifier(from, 'context name');
    assertIdentifier(to, 'context name');

    await Settings.update((settings) => {
      const state = materializeNamespaces(settings);
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

    return this.getContext(to);
  }

  async removeContext(name) {
    assertIdentifier(name, 'context name');
    let removed;
    let removedKeychainCredentialId = null;

    await Settings.update((settings) => {
      const state = materializeNamespaces(settings);

      removed = state.contextState.contexts[name];
      if (!removed) {
        throw new Error(`Context does not exist: ${name}`);
      }

      delete state.contextState.contexts[name];

      const authentication = removed.homeyAuthentication;

      if (authentication?.source === 'stored' && authentication.store === 'settings') {
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
      await OperatingSystemCredentialStore.remove(removedKeychainCredentialId);
    }

    return clone(removed);
  }

  async setLegacySelection(target) {
    const context = normalizeContext({
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

    await Settings.update((settings) => {
      const state = materializeNamespaces(settings);

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
    const state = await this.read();
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

  async listAuthenticationProfiles() {
    const state = await this.read();

    return Object.entries(state.authenticationProfiles.profiles).map(([name, profile]) => {
      const health = evaluateAuthenticationProfile(profile, state.credentials, {
        homeyApi: state.legacy.hasAuthentication ? {} : null,
      });

      return {
        name,
        profile: clone(profile),
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
    });
  }

  async getAuthenticationProfile(name) {
    assertIdentifier(name, 'authentication profile name');
    const profiles = await this.listAuthenticationProfiles();

    return (
      profiles.find((profile) => {
        return profile.name === name;
      }) ?? null
    );
  }

  async saveAuthenticationProfile(name, profile) {
    assertIdentifier(name, 'authentication profile name');

    await Settings.update((settings) => {
      const state = materializeNamespaces(settings);
      state.authenticationProfiles.profiles[name] = clone(profile);
    });

    return this.getAuthenticationProfile(name);
  }

  async createPatAuthenticationProfile(name, variable, metadata = {}, options = {}) {
    assertIdentifier(name, 'authentication profile name');

    if (typeof variable !== 'string' || variable.length === 0) {
      throw new Error('A PAT authentication profile requires an environment variable name.');
    }

    const existing = await this.getAuthenticationProfile(name);

    if (existing && !options.replace) {
      throw new Error(`Authentication profile already exists: ${name}`);
    }

    const existingAccountId = existing?.profile.accountId ?? null;
    const nextAccountId = metadata.accountId ?? null;
    const changesIdentity =
      existingAccountId && nextAccountId && existingAccountId !== nextAccountId;

    if (changesIdentity && !options.replaceAccount) {
      throw new Error(
        `Credentials resolve to a different Athom account. Re-run with --replace-account to replace ${existingAccountId}.`,
      );
    }

    const previousSource = existing?.profile.credentialSource;

    await Settings.update((settings) => {
      const state = materializeNamespaces(settings);

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

      if (
        previousSource?.type === 'oauth' &&
        !previousSource.legacy &&
        previousSource.store === 'settings'
      ) {
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
      await OperatingSystemCredentialStore.remove(previousSource.credentialId);
    }

    return this.getAuthenticationProfile(name);
  }

  async prepareOAuthAuthenticationProfile(name, store = 'settings') {
    assertIdentifier(name, 'authentication profile name');

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
      await Settings.update((settings) => {
        const state = materializeNamespaces(settings);

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
        await OperatingSystemCredentialStore.remove(credentialId);
      }

      throw err;
    }

    return source;
  }

  async completeOAuthAuthenticationProfile(name, source, metadata, options = {}) {
    const existing = await this.getAuthenticationProfile(name);

    const existingAccountId = existing?.profile.accountId;
    const changesIdentity =
      existingAccountId && metadata.accountId && existingAccountId !== metadata.accountId;

    if (changesIdentity && !options.replaceAccount) {
      throw new Error(
        `Credentials resolve to a different Athom account. Re-run with --replace-account to replace ${existingAccountId}.`,
      );
    }

    let previousSource = null;

    await Settings.update((settings) => {
      const state = materializeNamespaces(settings);
      previousSource = state.authenticationProfiles.profiles[name]?.credentialSource;

      state.authenticationProfiles.profiles[name] = {
        accountId: metadata.accountId ?? null,
        email: metadata.email ?? null,
        displayName: metadata.displayName ?? null,
        credentialSource: source,
        authenticated: true,
      };

      if (
        previousSource?.type === 'oauth' &&
        !previousSource.legacy &&
        previousSource.store === 'settings'
      ) {
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
      await OperatingSystemCredentialStore.remove(previousSource.credentialId);
    }

    return this.getAuthenticationProfile(name);
  }

  async discardOAuthCredential(source) {
    if (source?.type !== 'oauth' || source.legacy) {
      return;
    }

    if (source.store === 'keychain') {
      await OperatingSystemCredentialStore.remove(source.credentialId);
    }

    await Settings.update((settings) => {
      const state = materializeNamespaces(settings);

      delete state.credentials.entries[source.credentialId];
    });
  }

  async renameAuthenticationProfile(from, to) {
    assertIdentifier(from, 'authentication profile name');
    assertIdentifier(to, 'authentication profile name');

    await Settings.update((settings) => {
      const state = materializeNamespaces(settings);
      const profile = state.authenticationProfiles.profiles[from];

      if (!profile) {
        throw new Error(`Authentication profile does not exist: ${from}`);
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

    return this.getAuthenticationProfile(to);
  }

  async removeAuthenticationProfile(name) {
    assertIdentifier(name, 'authentication profile name');
    let removed;

    await Settings.update((settings) => {
      const state = materializeNamespaces(settings);
      removed = state.authenticationProfiles.profiles[name];

      if (!removed) {
        throw new Error(`Authentication profile does not exist: ${name}`);
      }

      delete state.authenticationProfiles.profiles[name];

      const source = removed.credentialSource;
      if (source?.type === 'oauth' && !source.legacy && source.store === 'settings') {
        delete state.credentials.entries[source.credentialId];
      }

      if (name === DEFAULT_IDENTIFIER) {
        settings.homeyApi = null;
      }
    });

    const source = removed.credentialSource;

    if (source?.type === 'oauth' && !source.legacy && source.store === 'keychain') {
      await OperatingSystemCredentialStore.remove(source.credentialId);
    }

    return clone(removed);
  }

  async markAuthenticationProfileLoggedOut(name) {
    assertIdentifier(name, 'authentication profile name');

    await Settings.update((settings) => {
      const state = materializeNamespaces(settings);
      const profile = state.authenticationProfiles.profiles[name];

      if (!profile) {
        throw new Error(`Authentication profile does not exist: ${name}`);
      }

      profile.authenticated = false;
    });
  }

  async migrateAuthenticationProfile(name, to) {
    assertIdentifier(name, 'authentication profile name');

    if (!['settings', 'keychain'].includes(to)) {
      throw new Error(`Unknown credential store: ${String(to)}`);
    }

    const state = await this.read();
    const profile = state.authenticationProfiles.profiles[name];

    if (!profile) {
      throw new Error(`Authentication profile does not exist: ${name}`);
    }

    const source = profile.credentialSource;

    if (source?.type !== 'oauth') {
      throw new Error('Only persistent OAuth authentication profiles can be migrated.');
    }

    if (!source.legacy && source.store === to) {
      return this.getAuthenticationProfile(name);
    }

    let credential;

    if (source.legacy) {
      credential = {
        kind: 'oauth',
        value: (await Settings.get('homeyApi')) ?? {},
      };
    } else if (source.store === 'settings') {
      credential = clone(state.credentials.entries[source.credentialId]);
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
      await Settings.update((settings) => {
        const mutableState = materializeNamespaces(settings);
        const mutableProfile = mutableState.authenticationProfiles.profiles[name];

        if (!mutableProfile) {
          throw new Error(`Authentication profile does not exist: ${name}`);
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

        if (!source.legacy && source.store === 'settings') {
          delete mutableState.credentials.entries[source.credentialId];
        }

        if (source.legacy) {
          settings.homeyApi = null;
        }
      });
    } catch (err) {
      if (to === 'keychain') {
        await OperatingSystemCredentialStore.remove(credentialId);
      }

      throw err;
    }

    if (!source.legacy && source.store === 'keychain') {
      await OperatingSystemCredentialStore.remove(source.credentialId);
    }

    return this.getAuthenticationProfile(name);
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
    const state = await this.read();
    let name = null;
    let source = null;

    if (typeof explicitName === 'string' && explicitName.length > 0) {
      name = explicitName;
      source = 'argument';
    } else if (process.env.HOMEY_CONTEXT) {
      name = process.env.HOMEY_CONTEXT;
      source = 'environment';
    } else if (state.contextState.current) {
      name = state.contextState.current;
      source = 'current';
    }

    if (!name) {
      return null;
    }

    assertIdentifier(name, 'context name');
    const context = state.contextState.contexts[name];

    if (!context) {
      const error = new Error(
        `Selected context "${name}" from ${source} does not exist. Run \`homey context ls\` and select a valid context.`,
      );

      error.selectionSource = source;
      throw error;
    }

    return {
      name,
      source,
      context: clone(context),
      health: evaluateContextHealth(context, state, {
        homeyApi: state.legacy.hasAuthentication ? {} : null,
      }),
      state,
    };
  }

  evaluateContextHealth(context, state, requiredCapability = null) {
    return evaluateContextHealth(
      context,
      state,
      {
        homeyApi: state.legacy?.hasAuthentication ? {} : null,
      },
      requiredCapability,
    );
  }
}

module.exports = {
  CliStateRepository,
  DEFAULT_DISCOVERY_STRATEGIES,
  DEFAULT_IDENTIFIER,
  DISCOVERY_STRATEGIES,
  IDENTIFIER_PATTERN,
};
