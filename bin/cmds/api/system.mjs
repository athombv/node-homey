'use strict';

import { createHomeyManagerCommand } from '../../../lib/api/ApiManagerCommand.mjs';

const command = createHomeyManagerCommand({
  managerIdCamelCase: 'system',
  description: 'System manager operations',
  preferredDefaultOperationIds: ['getInfo'],
});

export const { desc, builder, handler } = command;
