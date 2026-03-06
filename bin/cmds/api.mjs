'use strict';

import { DEFAULT_TIMEOUT } from '../../lib/api/ApiCommandConstants.mjs';

export const desc = 'Direct Homey API commands';
export const builder = (yargs) => {
  return yargs
    .option('json', {
      type: 'boolean',
      default: false,
      description: 'Output raw JSON',
    })
    .option('timeout', {
      type: 'number',
      default: DEFAULT_TIMEOUT,
      description: 'Request timeout in milliseconds',
    })
    .option('token', {
      type: 'string',
      description: 'Use token mode (requires --address or --homey-id)',
    })
    .option('address', {
      type: 'string',
      description: 'Homey base URL for token mode, e.g. http://192.168.1.100',
    })
    .option('homey-id', {
      type: 'string',
      description: 'Target a cached Homey by id instead of the selected Homey',
    })
    .commandDir('api', {
      extensions: ['.mjs'],
    })
    .demandCommand()
    .help();
};
