import Settings from '../services/Settings.js';
import {
  createCliStateReadResult,
  materializeCliStateNamespaces,
} from './LegacyCliStateAdapter.mjs';

export class CliStateStore {
  async read() {
    const snapshot = await this.readSnapshot();

    return snapshot.state;
  }

  async readSnapshot() {
    const settings = await Settings.read();

    return {
      state: createCliStateReadResult(settings),
      settings,
    };
  }

  async update(mutator) {
    return await Settings.update(async (settings) => {
      const state = materializeCliStateNamespaces(settings);

      return await mutator(state, settings);
    });
  }
}
