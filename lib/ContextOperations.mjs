import AuthenticationProfiles from '../services/AuthenticationProfiles.js';
import CliState from '../services/CliState.js';

export async function refreshContextTargetMetadata(name) {
  const entry = await CliState.getContext(name);

  if (!entry) {
    throw new Error(`Context does not exist: ${name}`);
  }

  const profileName = entry.context.authenticationProfile;
  const homeyId = entry.context.target.homeyId;

  if (!profileName || !homeyId) {
    throw new Error('Refreshing target metadata requires an authentication profile and Homey ID.');
  }

  const accountClient = await AuthenticationProfiles.getClient(profileName, {
    allowInteractiveLogin: process.stdin.isTTY,
  });
  const homey = await accountClient.getHomey(homeyId);

  return await CliState.updateContext(name, (context) => {
    context.target.name = homey.name;
    context.target.platform = homey.platform;

    return context;
  });
}

export default {
  refreshContextTargetMetadata,
};
