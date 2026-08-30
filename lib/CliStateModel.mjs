const CONTEXT_SCHEMA_VERSION = 1;
const AUTHENTICATION_SCHEMA_VERSION = 1;
const CREDENTIAL_SCHEMA_VERSION = 1;
export const DEFAULT_IDENTIFIER = 'default';
const IDENTIFIER_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;
const DISCOVERY_STRATEGIES = new Set(['mdns', 'cloud', 'local', 'localSecure', 'remoteForwarded']);
export const DEFAULT_DISCOVERY_STRATEGIES = ['localSecure', 'local', 'remoteForwarded', 'cloud'];

export function cloneCliStateValue(value) {
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

export function getStoredCliStateNamespaces(settings) {
  assertSupportedSchema('context state', settings.contextState, CONTEXT_SCHEMA_VERSION);
  assertSupportedSchema(
    'authentication profiles',
    settings.authenticationProfiles,
    AUTHENTICATION_SCHEMA_VERSION,
  );
  assertSupportedSchema('credentials', settings.credentials, CREDENTIAL_SCHEMA_VERSION);

  return {
    contextState: cloneCliStateValue(settings.contextState) ?? createEmptyContextState(),
    authenticationProfiles:
      cloneCliStateValue(settings.authenticationProfiles) ?? createEmptyAuthenticationProfiles(),
    credentials: cloneCliStateValue(settings.credentials) ?? createEmptyCredentials(),
  };
}

export function assertCliStateIdentifier(identifier, label = 'identifier') {
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

export function normalizeCliContext(context) {
  const target = normalizeTarget(context.target);
  const route = normalizeRoute(context.route, target);
  const homeyAuthentication = normalizeHomeyAuthentication(context.homeyAuthentication);
  const authenticationProfile = context.authenticationProfile ?? null;

  if (authenticationProfile !== null) {
    assertCliStateIdentifier(authenticationProfile, 'authentication profile');
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

export function isLegacyAuthenticationUsable(homeyApi) {
  return (
    typeof homeyApi?.token?.access_token === 'string' && homeyApi.token.access_token.length > 0
  );
}
