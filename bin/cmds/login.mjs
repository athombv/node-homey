import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';

export const desc = 'Log in with an Athom account';

function ensureInteractiveTerminal() {
  return Boolean(process.stdin.isTTY && process.stdout.isTTY);
}

export function formatLoggedInProfile(profile = {}) {
  return `You are now logged in as ${profile.firstname} ${profile.lastname} <${profile.email}>`;
}

export const LoginCommandHelpers = {
  async runInteractiveLogin() {
    const HomeyLoginRuntime = await import('../../lib/ui/homey-login/homey-login-runtime.mjs');
    return HomeyLoginRuntime.renderHomeyLoginRuntime({
      createLoginSession() {
        return AthomApi.createLoginSession();
      },
    });
  },
  async runTextLogin() {
    return AthomApi.login();
  },
};

export const handler = async (yargs) => {
  try {
    if (!ensureInteractiveTerminal()) {
      await LoginCommandHelpers.runTextLogin();
      process.exit(0);
      return;
    }

    const result = await LoginCommandHelpers.runInteractiveLogin();

    if (result.status === 'cancelled') {
      Log.warning('Login cancelled.');
      process.exit(1);
      return;
    }

    if (result.status === 'error') {
      throw result.error;
    }

    Log.success(formatLoggedInProfile(result.profile));
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
