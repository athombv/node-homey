'use strict';

import React, { useState } from 'react';
/* eslint-disable import/no-unresolved, node/no-missing-import */
import {
  Box,
  Text,
  render,
  useInput,
} from 'ink';
/* eslint-enable import/no-unresolved, node/no-missing-import */
import Log from '../../../lib/Log.js';
import AthomApi from '../../../services/AthomApi.js';
import {
  getUiTheme,
  HomeyOverviewBox,
  mapHomeyOverview,
} from '../homey-ui.mjs';

function createPerfTracker(enabled) {
  const startTime = performance.now();
  let lastTime = startTime;

  return {
    mark(name) {
      if (!enabled) return;

      const now = performance.now();
      const delta = Math.round(now - lastTime);
      const total = Math.round(now - startTime);
      lastTime = now;
      Log.info(`[perf] ${name}: +${delta}ms (total ${total}ms)`);
    },
  };
}

function HomeyPicker({
  activeHomeyId,
  compactLayout,
  homeys,
  initialCursor,
  onSubmit,
  onCancel,
  uiTheme,
}) {
  const [cursor, setCursor] = useState(initialCursor);
  const [numberBuffer, setNumberBuffer] = useState('');
  const [inputError, setInputError] = useState('');

  const parsedNumber = numberBuffer.length > 0
    ? Number.parseInt(numberBuffer, 10)
    : null;
  const selectedByNumberIndex = parsedNumber >= 1 && parsedNumber <= homeys.length
    ? parsedNumber - 1
    : -1;
  const selectedByNumber = selectedByNumberIndex >= 0
    ? homeys[selectedByNumberIndex]
    : null;
  const previewHomey = selectedByNumber || homeys[cursor] || null;
  const numberWidth = String(homeys.length).length;

  const maxLabelLength = homeys.reduce((max, homey) => {
    const label = homey.id === activeHomeyId
      ? `${homey.name} (current)`
      : homey.name;
    return Math.max(max, label.length);
  }, 0);

  useInput((input, key) => {
    if (key.upArrow) {
      setNumberBuffer('');
      setInputError('');
      setCursor((prev) => (prev === 0 ? homeys.length - 1 : prev - 1));
      return;
    }

    if (key.downArrow) {
      setNumberBuffer('');
      setInputError('');
      setCursor((prev) => (prev + 1) % homeys.length);
      return;
    }

    if (key.backspace || key.delete) {
      setInputError('');
      setNumberBuffer((prev) => prev.slice(0, -1));
      return;
    }

    if (/^[0-9]$/.test(input)) {
      setInputError('');
      setNumberBuffer((prev) => `${prev}${input}`);
      return;
    }

    if (key.return) {
      if (numberBuffer.length > 0) {
        if (selectedByNumber) {
          onSubmit(selectedByNumber);
          return;
        }

        setInputError(`No Homey for number ${numberBuffer}.`);
        return;
      }

      onSubmit(homeys[cursor]);
      return;
    }

    if (key.escape) {
      if (numberBuffer.length > 0) {
        setNumberBuffer('');
        setInputError('');
        return;
      }

      onCancel();
      return;
    }

    if (input === 'q' && !key.ctrl && !key.meta) {
      onCancel();
    }
  });

  const items = homeys.map((homey, index) => {
    const isActive = selectedByNumberIndex >= 0
      ? index === selectedByNumberIndex
      : index === cursor;
    const isCurrent = homey.id === activeHomeyId;
    const label = isCurrent
      ? `${homey.name} (current)`
      : homey.name;
    const numberPrefix = `${String(index + 1).padStart(numberWidth, ' ')}.`;
    const line = ` ${numberPrefix} ${label.padEnd(maxLabelLength, ' ')} `;

    const lineStyle = isActive ? uiTheme.activeLine : {};

    return React.createElement(
      Text,
      {
        key: homey.id,
        dimColor: !isActive && !isCurrent,
        ...lineStyle,
      },
      line,
    );
  });

  return React.createElement(
    Box,
    { flexDirection: 'column' },
    React.createElement(Text, { bold: true }, 'Select your active Homey'),
    React.createElement(Text, { dimColor: true }, 'Up/Down to navigate, type a number + Enter, Esc or q to cancel.'),
    numberBuffer.length > 0
      ? React.createElement(
        Text,
        { color: selectedByNumber ? 'green' : 'yellow' },
        selectedByNumber
          ? `Number selection: ${numberBuffer} (${selectedByNumber.name})`
          : `Number selection: ${numberBuffer} (range: 1-${homeys.length})`,
      )
      : null,
    inputError
      ? React.createElement(Text, { color: 'red' }, inputError)
      : null,
    React.createElement(
      Box,
      {
        marginTop: 1,
        flexDirection: compactLayout ? 'column' : 'row',
      },
      React.createElement(Box, {
        borderStyle: 'round',
        borderColor: uiTheme.borderColor,
        paddingX: 1,
        flexDirection: 'column',
      }, items),
      React.createElement(HomeyOverviewBox, {
        homey: previewHomey,
        marginLeft: compactLayout ? 0 : 2,
        marginTop: compactLayout ? 1 : 0,
        title: 'Overview',
        uiTheme,
        width: compactLayout ? undefined : 44,
      }),
    ),
  );
}

export default async function handler(yargs = {}) {
  try {
    if (!process.stdout.isTTY) {
      throw new Error('`homey select new` requires an interactive terminal.');
    }

    const useLocalDiscovery = Boolean(yargs.local);

    const perf = createPerfTracker(process.env.HOMEY_PERF === '1');

    const selectedHomey = await AthomApi.getSelectedHomey();
    perf.mark('loaded selected homey');
    const uiTheme = getUiTheme();
    const compactLayout = Boolean(process.stdout.columns && process.stdout.columns < 96);

    const homeys = (await AthomApi.getHomeys({ local: useLocalDiscovery }))
      .filter((homey) => {
        if (homey.state && homey.state.indexOf('online') !== 0) return false;
        return true;
      })
      .map(mapHomeyOverview)
      .sort((homeyA, homeyB) => homeyA.name.localeCompare(homeyB.name));
    perf.mark('loaded homey list');

    if (homeys.length === 0) {
      throw new Error('No online Homey found');
    }

    const initialCursor = Math.max(homeys.findIndex((homey) => homey.id === selectedHomey?.id), 0);

    let resolveSelection;

    const selectionPromise = new Promise((resolve) => {
      resolveSelection = resolve;
    });

    const app = render(React.createElement(HomeyPicker, {
      activeHomeyId: selectedHomey?.id,
      compactLayout,
      homeys,
      initialCursor,
      onSubmit: (homey) => resolveSelection(homey),
      onCancel: () => resolveSelection(null),
      uiTheme,
    }));

    const nextHomey = await selectionPromise;
    perf.mark('selection finished');
    app.unmount();
    await app.waitUntilExit();

    if (!nextHomey) {
      Log('Selection cancelled.');
      process.exit(0);
    }

    await AthomApi.setActiveHomey(nextHomey);
    perf.mark('stored selected homey');

    Log(`You have selected \`${nextHomey.name}\` as your active Homey.`);
    process.exit(0);
  } catch (err) {
    Log.error(err);
    process.exit(1);
  }
}
