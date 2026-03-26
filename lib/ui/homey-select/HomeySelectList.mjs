import { createElement } from 'react';
import { Box } from 'ink';
import { HomeySelectEmptyState } from './HomeySelectEmptyState.mjs';
import { HomeySelectLoadingState } from './HomeySelectLoadingState.mjs';
import { HomeySelectOverflowMarker } from './HomeySelectOverflowMarker.mjs';
import { HomeySelectRow } from './HomeySelectRow.mjs';
import { useHomeySelectListModel } from './homey-select-store.mjs';

export function HomeySelectList({ listGapRows, maxVisibleRows, rowContentWidth }) {
  const listModel = useHomeySelectListModel(maxVisibleRows);

  return createElement(
    Box,
    {
      flexDirection: 'column',
      flexGrow: 1,
      overflowY: 'hidden',
      paddingTop: listGapRows,
      paddingX: 0,
    },
    listModel.listState === 'loading'
      ? createElement(HomeySelectLoadingState)
      : listModel.listState === 'items'
        ? createElement(
            Box,
            { flexDirection: 'column' },
            listModel.hiddenAboveCount > 0
              ? createElement(HomeySelectOverflowMarker, {
                  count: listModel.hiddenAboveCount,
                  direction: 'above',
                  key: 'overflow-above',
                })
              : null,
            ...listModel.rowIds.map((rowId) => {
              return createElement(HomeySelectRow, {
                key: rowId,
                rowId,
                rowContentWidth,
              });
            }),
            listModel.hiddenBelowCount > 0
              ? createElement(HomeySelectOverflowMarker, {
                  count: listModel.hiddenBelowCount,
                  direction: 'below',
                  key: 'overflow-below',
                })
              : null,
          )
        : createElement(HomeySelectEmptyState, {
            hasInteractiveHomeys: listModel.hasInteractiveHomeys,
            query: listModel.query,
          }),
  );
}
