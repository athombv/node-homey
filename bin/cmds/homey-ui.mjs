'use strict';

import React from 'react';
/* eslint-disable import/no-unresolved, node/no-missing-import */
import {
  Box,
  Text,
} from 'ink';
/* eslint-enable import/no-unresolved, node/no-missing-import */

export function mapHomeyOverview(homey = {}) {
  return {
    id: homey.id || homey._id || '-',
    name: homey.name || '-',
    model: homey.model || homey.platformVersion || homey.platform || 'Unknown',
    softwareVersion: homey.softwareVersion || 'Unknown',
  };
}

function getTerminalTheme() {
  const background = process.env.TERM_BACKGROUND;

  if (background === 'light' || background === 'dark') {
    return background;
  }

  const colorFgBg = process.env.COLORFGBG;
  if (!colorFgBg) {
    return 'unknown';
  }

  const values = colorFgBg.split(';');
  const backgroundValue = Number.parseInt(values[values.length - 1], 10);

  if (Number.isNaN(backgroundValue)) {
    return 'unknown';
  }

  if (backgroundValue >= 7) {
    return 'light';
  }

  return 'dark';
}

export function getUiTheme() {
  const terminalTheme = getTerminalTheme();

  if (terminalTheme === 'light') {
    return {
      activeLine: {
        color: 'white',
        backgroundColor: 'blue',
      },
      borderColor: 'black',
    };
  }

  if (terminalTheme === 'dark') {
    return {
      activeLine: {
        color: 'black',
        backgroundColor: 'cyan',
      },
      borderColor: 'gray',
    };
  }

  return {
    activeLine: {
      inverse: true,
    },
    borderColor: 'gray',
  };
}

export function HomeyOverviewBox({
  homey,
  title,
  uiTheme,
  width,
  ...boxProps
}) {
  const details = mapHomeyOverview(homey);

  return React.createElement(Box, {
    borderStyle: 'round',
    borderColor: uiTheme.borderColor,
    paddingX: 1,
    width,
    flexDirection: 'column',
    ...boxProps,
  },
  React.createElement(Text, { bold: true }, title || 'Overview'),
  React.createElement(Text, { dimColor: true }, 'Name'),
  React.createElement(Text, { wrap: 'truncate-end' }, details.name),
  React.createElement(Text, { dimColor: true }, 'ID'),
  React.createElement(Text, { wrap: 'truncate-end' }, details.id),
  React.createElement(Text, { dimColor: true }, 'Model'),
  React.createElement(Text, { wrap: 'truncate-end' }, details.model),
  React.createElement(Text, { dimColor: true }, 'Software Version'),
  React.createElement(Text, { wrap: 'truncate-end' }, details.softwareVersion));
}
