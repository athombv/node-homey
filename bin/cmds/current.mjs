import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';

export const desc = 'Show the active Homey';
export const handler = async () => {
  try {
    const activeHomey = await AthomApi.getSelectedHomey();

    if (!activeHomey) {
      Log('No active Homey selected. Run `homey select` to choose one.');
      process.exit(0);
    }

    Log(`Active Homey: ${activeHomey.name} (${activeHomey.id})`);
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
};
