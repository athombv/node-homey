'use strict';

import { createHomeyManagerCommand } from '../../../lib/api/ApiManagerCommand.mjs';

const command = createHomeyManagerCommand({
  managerIdCamelCase: 'devices',
  description: 'Devices manager operations',
  preferredDefaultOperationIds: ['getDevices'],
});

export const { desc, builder, handler } = command;
