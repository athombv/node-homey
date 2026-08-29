import { AuthenticationProfiles } from '../services/AuthenticationProfiles.mjs';
import { CliState } from '../services/CliState.mjs';
import AthomApi from './AthomApi.js';

async function selectLegacyContextInteractively() {
  const accountClient = new AthomApi({
    diagnosticOutput: process.stderr,
  });

  await accountClient.selectActiveHomey();
}

function getRouteAddress(route) {
  if (route?.type !== 'address') {
    return null;
  }

  return route.address;
}

function selectAuthenticationMode({ requestedMode, directToken, authenticationProfile }) {
  if (requestedMode === 'homey') {
    if (!directToken) {
      throw new Error('The selected context has no usable direct Homey authentication.');
    }

    return 'homey';
  }

  if (requestedMode === 'account') {
    if (!authenticationProfile) {
      throw new Error('The selected context has no account authentication profile.');
    }

    return 'account';
  }

  if (directToken) {
    return 'homey';
  }

  if (authenticationProfile) {
    return 'account';
  }

  throw new Error('The selected context has no usable Homey authentication.');
}

function validateExplicitTokenOverlay({ token, address, homeyId }) {
  if (token && address && homeyId) {
    throw new Error(
      'Invalid option usage: --address and --homey-id cannot be used together with --token.',
    );
  }

  if (token && !address && !homeyId) {
    throw new Error('Missing required option: --address or --homey-id (required with --token).');
  }
}

function shouldUseContextResolution(argv, selection) {
  if (argv.context !== undefined || process.env.HOMEY_CONTEXT) {
    return true;
  }

  if (argv.auth === undefined) {
    return false;
  }

  if (argv.auth !== 'auto') {
    return true;
  }

  if (!selection) {
    return false;
  }

  const profileName = selection.context.authenticationProfile;
  const profile = profileName ? selection.state.authenticationProfiles.profiles[profileName] : null;
  const usesLegacyDefault =
    selection.name === 'default' &&
    profileName === 'default' &&
    profile?.credentialSource?.legacy === true;

  return !usesLegacyDefault;
}

async function resolveContextSelection(argv) {
  let selection;

  try {
    selection = await CliState.resolveContextSelection(argv.context);
  } catch (err) {
    const canRecoverBrokenCurrent = err?.selectionSource === 'current' && process.stdin.isTTY;

    if (!canRecoverBrokenCurrent) {
      throw err;
    }

    await selectLegacyContextInteractively();
    selection = await CliState.resolveContextSelection(argv.context);
  }

  return selection;
}

async function completeMissingHomeySelection(argv, selection, scope) {
  const hasExplicitTarget = Boolean(argv.homeyId || argv.address);

  if (!selection && !hasExplicitTarget && scope === 'homey' && process.stdin.isTTY) {
    await selectLegacyContextInteractively();

    return await CliState.resolveContextSelection(argv.context);
  }

  return selection;
}

async function resolveEffectiveContextFromSelection(argv, selection, scope) {
  const selectedContext = selection?.context ?? null;
  const selectedTarget = selectedContext?.target ?? {};
  const explicitHomeyId = typeof argv.homeyId === 'string' && argv.homeyId.length > 0;
  const explicitAddress = typeof argv.address === 'string' && argv.address.length > 0;
  const explicitToken = typeof argv.token === 'string' && argv.token.length > 0;
  const contextAddress = getRouteAddress(selectedContext?.route);
  const replacesContextIdentity = explicitToken && explicitAddress && !explicitHomeyId;
  let homeyId = selectedTarget.homeyId ?? null;
  let address = contextAddress;

  if (explicitHomeyId) {
    homeyId = argv.homeyId;
  } else if (explicitToken && explicitAddress) {
    homeyId = null;
  }

  if (explicitAddress) {
    address = argv.address;
  } else if (explicitToken && explicitHomeyId) {
    address = null;
  }

  const contextToken = await CliState.resolveDirectToken(selection);
  const directToken = explicitToken ? argv.token : contextToken;
  const authenticationProfile = selection
    ? (selectedContext.authenticationProfile ?? null)
    : 'default';
  const requestedMode = argv.auth ?? 'auto';

  if (explicitToken) {
    validateExplicitTokenOverlay({
      token: directToken,
      address,
      homeyId,
    });
  }

  if (explicitAddress && !directToken) {
    throw new Error(
      'Invalid option usage: --address can only be used together with --token or direct Homey authentication from the selected context.',
    );
  }

  if (scope === 'account' && requestedMode === 'homey') {
    throw new Error('Account-scoped operations cannot use direct Homey authentication.');
  }

  if (scope === 'account' && !authenticationProfile) {
    throw new Error('The selected context has no account authentication profile.');
  }

  const authMode =
    scope === 'account'
      ? 'account'
      : selectAuthenticationMode({
          requestedMode,
          directToken,
          authenticationProfile,
        });

  if (scope === 'homey' && !homeyId && !address) {
    throw new Error(
      'No active Homey selected. Run `homey select` to choose one. You can also run `homey context use <name>`.',
    );
  }

  const accountClient =
    authMode === 'account' || (directToken && homeyId && !address)
      ? await AuthenticationProfiles.getClient(authenticationProfile, {
          allowInteractiveLogin: process.stdin.isTTY,
        })
      : null;
  const effectiveContext = {
    name: selection?.name ?? null,
    selectionSource: selection?.source ?? null,
    target: {
      homeyId,
      name: replacesContextIdentity ? null : (selectedTarget.name ?? null),
      platform: replacesContextIdentity ? null : (selectedTarget.platform ?? null),
    },
    authentication: {
      mode: authMode,
      profile: authMode === 'account' ? authenticationProfile : null,
      token: directToken,
    },
    route: explicitAddress
      ? {
          type: 'address',
          address,
        }
      : (selectedContext?.route ?? null),
    health: selection?.health ?? null,
  };

  return {
    effectiveContext: structuredClone(effectiveContext),
    accountClient,
  };
}

export async function resolveEffectiveContext(argv = {}, { scope = 'homey' } = {}) {
  let selection = await resolveContextSelection(argv);
  selection = await completeMissingHomeySelection(argv, selection, scope);

  return await resolveEffectiveContextFromSelection(argv, selection, scope);
}

export async function resolveCommandContext(
  argv = {},
  { scope = 'homey', authenticationMode = argv.auth } = {},
) {
  let selection = await resolveContextSelection(argv);
  const usesContextResolution = shouldUseContextResolution(argv, selection);

  if (!usesContextResolution) {
    return {
      usesContextResolution: false,
      effectiveContext: null,
      accountClient: null,
    };
  }

  selection = await completeMissingHomeySelection(argv, selection, scope);
  const effectiveArgv = {
    ...argv,
    auth: authenticationMode,
  };
  const resolution = await resolveEffectiveContextFromSelection(effectiveArgv, selection, scope);

  return {
    usesContextResolution: true,
    ...resolution,
  };
}

export default {
  resolveCommandContext,
  resolveEffectiveContext,
};
