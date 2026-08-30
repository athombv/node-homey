import {
  cloneCliStateValue,
  DEFAULT_DISCOVERY_STRATEGIES,
  DEFAULT_IDENTIFIER,
  getStoredCliStateNamespaces,
  isLegacyAuthenticationUsable,
} from './CliStateModel.mjs';

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

function applyLegacyCliStateViews(namespaces, settings) {
  const { contextState, authenticationProfiles } = namespaces;
  const hasStoredContextState = Boolean(
    settings.contextState && typeof settings.contextState === 'object',
  );
  const hasLegacyHomey = Boolean(
    !hasStoredContextState && settings.activeHomey && typeof settings.activeHomey.id === 'string',
  );
  const hasLegacyAuthentication = isLegacyAuthenticationUsable(settings.homeyApi);

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

export function materializeCliStateNamespaces(settings) {
  const namespaces = applyLegacyCliStateViews(getStoredCliStateNamespaces(settings), settings);

  settings.contextState = namespaces.contextState;
  settings.authenticationProfiles = namespaces.authenticationProfiles;
  settings.credentials = namespaces.credentials;

  return namespaces;
}

export function synchronizeLegacySelection(settings, activeHomey) {
  const namespaces = materializeCliStateNamespaces(settings);
  const { contextState, authenticationProfiles } = namespaces;

  if (!activeHomey) {
    contextState.current = null;
    return;
  }

  contextState.contexts[DEFAULT_IDENTIFIER] = createLegacyDefaultContext(activeHomey);
  contextState.current = DEFAULT_IDENTIFIER;

  if (!authenticationProfiles.profiles[DEFAULT_IDENTIFIER]) {
    authenticationProfiles.profiles[DEFAULT_IDENTIFIER] = createLegacyDefaultProfile(
      isLegacyAuthenticationUsable(settings.homeyApi),
    );
  }
}

export function createCliStateReadResult(settings) {
  const namespaces = applyLegacyCliStateViews(getStoredCliStateNamespaces(settings), settings);

  return {
    ...namespaces,
    legacy: {
      activeHomey: cloneCliStateValue(settings.activeHomey),
      hasAuthentication: isLegacyAuthenticationUsable(settings.homeyApi),
    },
  };
}
