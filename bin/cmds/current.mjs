'use strict';

import React from 'react';
/* eslint-disable import/no-unresolved, node/no-missing-import */
import {
  Box,
  Text,
  render,
} from 'ink';
/* eslint-enable import/no-unresolved, node/no-missing-import */
import Log from '../../lib/Log.js';
import AthomApi from '../../services/AthomApi.js';
import {
  getUiTheme,
  HomeyOverviewBox,
  mapHomeyOverview,
} from './homey-ui.mjs';

export default async function handler() {
  try {
    const activeHomey = await AthomApi.getSelectedHomey();

    if (!activeHomey) {
      Log('No active Homey selected. Run `homey select` to choose one.');
      process.exit(0);
    }

    const currentHomey = mapHomeyOverview(activeHomey);

    if (!process.stdout.isTTY) {
      Log(`Active Homey: ${currentHomey.name} (${currentHomey.id})`);
      Log(`Model: ${currentHomey.model}`);
      Log(`Software Version: ${currentHomey.softwareVersion}`);
      process.exit(0);
    }

    const app = render(React.createElement(
      Box,
      { flexDirection: 'column' },
      React.createElement(Text, { bold: true }, 'Active Homey'),
      React.createElement(
        Box,
        { marginTop: 1 },
        React.createElement(HomeyOverviewBox, {
          homey: currentHomey,
          title: 'Current Homey',
          uiTheme: getUiTheme(),
          width: 44,
        }),
      ),
    ));

    await new Promise((resolve) => setTimeout(resolve, 0));
    app.unmount();
    await app.waitUntilExit();

    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
}
