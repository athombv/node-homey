#!/usr/bin/env node

'use strict';

// eslint-disable-next-line node/no-unsupported-features/es-syntax, import/extensions
import('./homey.mjs').catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
