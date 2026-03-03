'use strict';

import { createHomeyManagerCommand } from '../../../../lib/api/ApiManagerCommand.mjs';

const command = createHomeyManagerCommand({
  managerIdCamelCase: 'flow',
  description: 'Flow manager operations',
  preferredDefaultOperationIds: ['getFlows'],
});

export const {
  desc,
  builder,
  handler,
} = command;
