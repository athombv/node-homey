import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';
import { AuthenticationProfiles } from '../../services/AuthenticationProfiles.mjs';
import { CliState } from '../../services/CliState.mjs';

export const desc = 'Log out the current user';
export const builder = (yargs) => {
  return yargs.option('auth-profile', {
    type: 'string',
    description: 'Log out a specific Athom authentication profile',
  });
};

export const handler = async (argv = {}) => {
  try {
    const profileName = await AuthenticationProfiles.resolveProfileName({
      explicitProfile: argv.authProfile,
      contextName: argv.context,
    });
    const profile = await CliState.getAuthenticationProfile(profileName);
    const usesUnprojectedLegacyDefault = profileName === 'default' && !profile;

    if (usesUnprojectedLegacyDefault) {
      await AthomApi.logout();
    } else {
      await AuthenticationProfiles.logout(profileName);
    }

    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
