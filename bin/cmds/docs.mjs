'use strict';

import { createRequire } from 'node:module';
import open from 'open';

const require = createRequire(import.meta.url);
const Log = require('../../lib/Log');

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
