import { createElement } from 'react';
import { Box, Text } from 'ink';
import {
  selectHomeySelectInteractiveCount,
  selectHomeySelectVisibleCount,
  useHomeySelectStore,
} from './homey-select-store.mjs';
import { formatHomeyCountSummary } from './homey-select-view.mjs';
import { HOMEY_UI_THEME } from '../theme.mjs';

export function HomeySelectHeader({ subtitle, title }) {
  const interactiveCount = useHomeySelectStore(selectHomeySelectInteractiveCount);
  const isLoading = useHomeySelectStore((state) => state.isLoading);
  const query = useHomeySelectStore((state) => state.query);
  const visibleCount = useHomeySelectStore(selectHomeySelectVisibleCount);
  const countText = isLoading
    ? 'Loading...'
    : formatHomeyCountSummary(visibleCount, interactiveCount);
  const filterText = query || 'all Homeys';

  return createElement(
    Box,
    { flexDirection: 'column' },
    createElement(Text, { color: HOMEY_UI_THEME.highlight, bold: true }, title),
    createElement(
      Box,
      { alignItems: 'center', justifyContent: 'space-between', width: '100%' },
      createElement(
        Box,
        { alignItems: 'center', flexGrow: 1, flexShrink: 1, marginRight: 2 },
        createElement(Text, { color: HOMEY_UI_THEME.textLight }, 'Filter: '),
        createElement(
          Box,
          { flexShrink: 1 },
          createElement(
            Text,
            {
              color: query ? HOMEY_UI_THEME.text : HOMEY_UI_THEME.textLight,
              wrap: 'truncate-end',
            },
            filterText,
          ),
        ),
      ),
      createElement(
        Box,
        { flexShrink: 0 },
        createElement(Text, { color: HOMEY_UI_THEME.textLight }, countText),
      ),
    ),
    subtitle ? createElement(Text, { color: HOMEY_UI_THEME.textLight }, subtitle) : null,
  );
}
