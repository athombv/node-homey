import React from 'react';
import { Box } from 'ink';
import { HomeySelectorEmptyState } from './HomeySelectorEmptyState.mjs';
import { HomeySelectorLoadingState } from './HomeySelectorLoadingState.mjs';
import { HomeySelectorOverflowMarker } from './HomeySelectorOverflowMarker.mjs';
import { HomeySelectorRow } from './HomeySelectorRow.mjs';
import { useHomeySelectorListModel } from './homey-selector-store.mjs';

const h = React.createElement;

export function HomeySelectorList({ listGapRows, maxVisibleRows, rowContentWidth }) {
  const listModel = useHomeySelectorListModel(maxVisibleRows);

  return h(
    Box,
    {
      flexDirection: 'column',
      flexGrow: 1,
      overflowY: 'hidden',
      paddingTop: listGapRows,
      paddingX: 0,
    },
    listModel.listState === 'loading'
      ? h(HomeySelectorLoadingState)
      : listModel.listState === 'items'
        ? h(
            Box,
            { flexDirection: 'column' },
            listModel.hiddenAboveCount > 0
              ? h(HomeySelectorOverflowMarker, {
                  count: listModel.hiddenAboveCount,
                  direction: 'above',
                  key: 'overflow-above',
                })
              : null,
            ...listModel.rowIds.map((rowId) => {
              return h(HomeySelectorRow, {
                key: rowId,
                rowId,
                rowContentWidth,
              });
            }),
            listModel.hiddenBelowCount > 0
              ? h(HomeySelectorOverflowMarker, {
                  count: listModel.hiddenBelowCount,
                  direction: 'below',
                  key: 'overflow-below',
                })
              : null,
          )
        : h(HomeySelectorEmptyState, {
            hasInteractiveHomeys: listModel.hasInteractiveHomeys,
            query: listModel.query,
          }),
  );
}
