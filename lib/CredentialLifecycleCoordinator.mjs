import { OperatingSystemCredentialStore } from './OperatingSystemCredentialStore.mjs';

export class CredentialLifecycleCoordinator {
  static async tryRemoveKeychainCredential(credentialId) {
    try {
      await OperatingSystemCredentialStore.remove(credentialId);
      return null;
    } catch (err) {
      return err;
    }
  }

  static async removeKeychainCredentialAfterCommit(credentialId, committedOperation) {
    return await CredentialLifecycleCoordinator.#removeKeychainCredentialWithWarning(
      credentialId,
      `${committedOperation} was committed, but obsolete keychain credential ${credentialId} could not be removed`,
    );
  }

  static async removeStagedKeychainCredential(credentialId, failedOperation) {
    return await CredentialLifecycleCoordinator.#removeKeychainCredentialWithWarning(
      credentialId,
      `${failedOperation} failed, and staged keychain credential ${credentialId} could not be removed`,
    );
  }

  static async #removeKeychainCredentialWithWarning(credentialId, failureDescription) {
    const cleanupError =
      await CredentialLifecycleCoordinator.tryRemoveKeychainCredential(credentialId);

    if (!cleanupError) {
      return null;
    }

    const cleanupErrorMessage = cleanupError?.message ?? String(cleanupError);

    console.error(`Warning: ${failureDescription}: ${cleanupErrorMessage}`);

    return cleanupError;
  }
}
