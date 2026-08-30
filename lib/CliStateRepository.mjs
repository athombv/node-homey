import { AuthenticationProfileRepository } from './AuthenticationProfileRepository.mjs';
import { CliStateStore } from './CliStateStore.mjs';
import { ContextRepository } from './ContextRepository.mjs';

export class CliStateRepository {
  #state;
  #contexts;
  #authenticationProfiles;

  constructor() {
    this.#state = new CliStateStore();
    this.#contexts = new ContextRepository(this.#state);
    this.#authenticationProfiles = new AuthenticationProfileRepository(this.#state);
  }

  async read() {
    return await this.#state.read();
  }

  async listContexts() {
    return await this.#contexts.listContexts();
  }

  async getDefaultCredentialStore() {
    return await this.#contexts.getDefaultCredentialStore();
  }

  async setDefaultCredentialStore(store) {
    return await this.#contexts.setDefaultCredentialStore(store);
  }

  async getContext(name) {
    return await this.#contexts.getContext(name);
  }

  async createContext(name, context, options = {}) {
    return await this.#contexts.createContext(name, context, options);
  }

  async updateContext(name, updater, options = {}) {
    return await this.#contexts.updateContext(name, updater, options);
  }

  async replaceContextDirectToken(name, token, store = 'settings') {
    return await this.#contexts.replaceContextDirectToken(name, token, store);
  }

  async useContext(name) {
    return await this.#contexts.useContext(name);
  }

  async clearCurrentContext() {
    await this.#contexts.clearCurrentContext();
  }

  async renameContext(from, to) {
    return await this.#contexts.renameContext(from, to);
  }

  async removeContext(name) {
    return await this.#contexts.removeContext(name);
  }

  async setLegacySelection(target) {
    await this.#contexts.setLegacySelection(target);
  }

  async getSelectedTarget() {
    return await this.#contexts.getSelectedTarget();
  }

  async listAuthenticationProfiles() {
    return await this.#authenticationProfiles.listAuthenticationProfiles();
  }

  async getAuthenticationProfile(name) {
    return await this.#authenticationProfiles.getAuthenticationProfile(name);
  }

  async saveAuthenticationProfile(name, profile) {
    return await this.#authenticationProfiles.saveAuthenticationProfile(name, profile);
  }

  async createPatAuthenticationProfile(name, variable, metadata = {}, options = {}) {
    return await this.#authenticationProfiles.createPatAuthenticationProfile(
      name,
      variable,
      metadata,
      options,
    );
  }

  async prepareOAuthAuthenticationProfile(name, store = 'settings') {
    return await this.#authenticationProfiles.prepareOAuthAuthenticationProfile(name, store);
  }

  async completeOAuthAuthenticationProfile(name, source, metadata, options = {}) {
    return await this.#authenticationProfiles.completeOAuthAuthenticationProfile(
      name,
      source,
      metadata,
      options,
    );
  }

  async discardOAuthCredential(source) {
    await this.#authenticationProfiles.discardOAuthCredential(source);
  }

  async renameAuthenticationProfile(from, to) {
    return await this.#authenticationProfiles.renameAuthenticationProfile(from, to);
  }

  async removeAuthenticationProfile(name) {
    return await this.#authenticationProfiles.removeAuthenticationProfile(name);
  }

  async markAuthenticationProfileLoggedOut(name) {
    await this.#authenticationProfiles.markAuthenticationProfileLoggedOut(name);
  }

  async migrateAuthenticationProfile(name, to, identityMetadata = null) {
    return await this.#authenticationProfiles.migrateAuthenticationProfile(
      name,
      to,
      identityMetadata,
    );
  }

  async resolveDirectToken(selection) {
    return await this.#contexts.resolveDirectToken(selection);
  }

  async resolveContextSelection(explicitName) {
    return await this.#contexts.resolveContextSelection(explicitName);
  }

  async evaluateContextHealth(context, state, requiredCapability = null) {
    return await this.#contexts.evaluateContextHealth(context, state, requiredCapability);
  }
}
