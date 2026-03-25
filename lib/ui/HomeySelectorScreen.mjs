import React from 'react';
import { Box, useStdout } from 'ink';
import { HomeySelectorFooter } from './HomeySelectorFooter.mjs';
import { HomeySelectorHeader } from './HomeySelectorHeader.mjs';
import { HomeySelectorList } from './HomeySelectorList.mjs';
import { useHomeySelectorInput } from './homey-selector-input.mjs';
import { HomeySelectorStoreProvider } from './homey-selector-store.mjs';
import { getHomeySelectorLayout } from './homey-selector-view.mjs';

const h = React.createElement;

function HomeySelectorScreenContent({ onCancel, onSubmit, subtitle, title }) {
  const { stdout } = useStdout();
  const layout = getHomeySelectorLayout({
    hasSubtitle: Boolean(subtitle),
    terminalColumns: stdout.columns,
    terminalRows: stdout.rows,
  });

  useHomeySelectorInput({
    onCancel,
    onSubmit,
  });

  return h(
    Box,
    {
      flexDirection: 'column',
      height: layout.terminalRows,
      overflow: 'hidden',
    },
    h(HomeySelectorHeader, {
      subtitle,
      title,
    }),
    h(HomeySelectorList, {
      listGapRows: layout.listGapRows,
      maxVisibleRows: layout.maxVisibleRows,
      rowContentWidth: layout.rowContentWidth,
    }),
    h(HomeySelectorFooter),
  );
}

export function HomeySelectorScreen({ onCancel, onSubmit, store, subtitle, title }) {
  return h(
    HomeySelectorStoreProvider,
    { store },
    h(HomeySelectorScreenContent, {
      onCancel,
      onSubmit,
      subtitle,
      title,
    }),
  );
}
