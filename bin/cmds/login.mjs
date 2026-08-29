import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';
import AuthenticationProfiles from '../../services/AuthenticationProfiles.js';
import CliState from '../../services/CliState.js';

export const desc = 'Log in with an Athom account';
export const builder = (yargs) => {
  return yargs.option('auth-profile', {
    type: 'string',
    description: 'Log in a specific Athom authentication profile',
  });
};

export const handler = async (argv = {}) => {
  try {
    const profileName = await AuthenticationProfiles.resolveProfileName({
      explicitProfile: argv.authProfile,
      contextName: argv.context,
    });
    const profile = await CliState.getAuthenticationProfile(profileName);
    const source = profile?.profile.credentialSource;
    const usesLegacyDefault = profileName === 'default' && (!source || source.legacy);

    if (usesLegacyDefault) {
      await AthomApi.login();
    } else {
      if (source?.type === 'patEnvironment') {
        const client = await AuthenticationProfiles.getClient(profileName, {
          allowInteractiveLogin: false,
          fresh: true,
        });

        await client.getProfile();
      } else {
        await AuthenticationProfiles.loginWithOAuth(profileName, {
          store: source?.store ?? (await CliState.getDefaultCredentialStore()),
        });
      }
    }

    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
