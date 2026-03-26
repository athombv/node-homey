import { createElement } from 'react';
import { Box, useStdout } from 'ink';
import { HomeySelectFooter } from './HomeySelectFooter.mjs';
import { HomeySelectHeader } from './HomeySelectHeader.mjs';
import { HomeySelectList } from './HomeySelectList.mjs';
import { useHomeySelectInput } from './useHomeySelectInput.mjs';
import { HomeySelectStoreProvider } from './homey-select-store.mjs';
import { getHomeySelectLayout } from './homey-select-view.mjs';

function HomeySelectScreenContent({ onCancel, onSubmit, subtitle, title }) {
  const { stdout } = useStdout();
  const layout = getHomeySelectLayout({
    hasSubtitle: Boolean(subtitle),
    terminalColumns: stdout.columns,
    terminalRows: stdout.rows,
  });

  useHomeySelectInput({
    onCancel,
    onSubmit,
  });

  return createElement(
    Box,
    {
      flexDirection: 'column',
      height: layout.terminalRows,
      overflow: 'hidden',
    },
    createElement(HomeySelectHeader, {
      subtitle,
      title,
    }),
    createElement(HomeySelectList, {
      listGapRows: layout.listGapRows,
      maxVisibleRows: layout.maxVisibleRows,
      rowContentWidth: layout.rowContentWidth,
    }),
    createElement(HomeySelectFooter),
  );
}

export function HomeySelectScreen({ onCancel, onSubmit, store, subtitle, title }) {
  return createElement(
    HomeySelectStoreProvider,
    { store },
    createElement(HomeySelectScreenContent, {
      onCancel,
      onSubmit,
      subtitle,
      title,
    }),
  );
}
