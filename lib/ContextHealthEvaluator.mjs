import { OperatingSystemCredentialStore } from './OperatingSystemCredentialStore.mjs';

function isHomeyCredentialUsable(entry) {
  return entry?.kind === 'homeyToken' && typeof entry.value === 'string' && entry.value.length > 0;
}

function isOAuthCredentialUsable(entry) {
  return entry?.kind === 'oauth' && Boolean(entry.value?.token?.access_token);
}

export async function evaluateAuthenticationProfileHealth(profile, credentials, settings) {
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

  if (source.legacy) {
    return settings.hasLegacyAuthentication
      ? { usable: true, reason: null }
      : { usable: false, reason: 'The legacy default login has no stored credentials.' };
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

  if (source.store === 'keychain') {
    const credential = await OperatingSystemCredentialStore.get(source.credentialId);

    return isOAuthCredentialUsable(credential)
      ? { usable: true, reason: null }
      : { usable: false, reason: 'Keychain account credentials are missing.' };
  }

  return isOAuthCredentialUsable(credentials.entries[source.credentialId])
    ? { usable: true, reason: null }
    : { usable: false, reason: 'Stored account credentials are missing.' };
}

async function evaluateDirectAuthentication(authentication, credentials) {
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
    const credential = await OperatingSystemCredentialStore.get(authentication.credentialId);

    return isHomeyCredentialUsable(credential)
      ? { configured: true, usable: true, reason: null }
      : {
          configured: true,
          usable: false,
          reason: 'Keychain Homey credentials are missing.',
        };
  }

  return isHomeyCredentialUsable(credentials.entries[authentication.credentialId])
    ? { configured: true, usable: true, reason: null }
    : { configured: true, usable: false, reason: 'Stored Homey credentials are missing.' };
}

function evaluateConnectionRoute(context) {
  if (context.target.platform !== 'cloud' || context.route.type !== 'discovery') {
    return { usable: true, reason: null };
  }

  const incompatibleStrategies = context.route.strategies.filter((strategy) => {
    return strategy !== 'cloud';
  });

  if (incompatibleStrategies.length === 0) {
    return { usable: true, reason: null };
  }

  if (context.route.strategies.includes('cloud')) {
    return {
      usable: true,
      reason: `Connection route: ${incompatibleStrategies.join(', ')} discovery is incompatible with Homey Cloud targets.`,
    };
  }

  return {
    usable: false,
    reason: `Connection route: Homey Cloud targets require cloud discovery; ${incompatibleStrategies.join(', ')} cannot reach this target.`,
  };
}

export async function evaluateContextHealth(
  context,
  namespaces,
  settings,
  requiredCapability = null,
) {
  const reasons = [];
  const profile = context.authenticationProfile
    ? namespaces.authenticationProfiles.profiles[context.authenticationProfile]
    : null;
  const accountPromise = context.authenticationProfile
    ? evaluateAuthenticationProfileHealth(profile, namespaces.credentials, settings)
    : Promise.resolve({ usable: false, reason: null });
  const [account, homey] = await Promise.all([
    accountPromise,
    evaluateDirectAuthentication(context.homeyAuthentication, namespaces.credentials),
  ]);
  const route = evaluateConnectionRoute(context);

  if (context.authenticationProfile && !account.usable) {
    reasons.push(`Account authentication: ${account.reason}`);
  }

  if (homey.configured && !homey.usable) {
    reasons.push(`Direct Homey authentication: ${homey.reason}`);
  }

  if (route.reason) {
    reasons.push(route.reason);
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

  if (requiredCapability !== 'account') {
    requiredCapabilityUsable = requiredCapabilityUsable && route.usable;
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
