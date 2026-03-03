'use strict';

import open from 'open';
import Log from '../../lib/Log.js';

export default async function handler() {
  try {
    const url = 'https://apps.developer.homey.app';
    Log.success(`Opening URL: ${url}`);
    await open(url);
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
}
