import React from 'react';
import { Box, Text } from 'ink';
import {
  selectHomeySelectorInteractiveCount,
  selectHomeySelectorVisibleCount,
  useHomeySelectorStore,
} from './homey-selector-store.mjs';
import { formatHomeyCountSummary } from './homey-selector-view.mjs';
import { HOMEY_UI_THEME } from './theme.mjs';

const h = React.createElement;

export function HomeySelectorHeader({ subtitle, title }) {
  const interactiveCount = useHomeySelectorStore(selectHomeySelectorInteractiveCount);
  const isLoading = useHomeySelectorStore((state) => state.isLoading);
  const query = useHomeySelectorStore((state) => state.query);
  const visibleCount = useHomeySelectorStore(selectHomeySelectorVisibleCount);
  const countText = isLoading
    ? 'Loading...'
    : formatHomeyCountSummary(visibleCount, interactiveCount);
  const filterText = query || 'all Homeys';

  return h(
    Box,
    { flexDirection: 'column' },
    h(Text, { color: HOMEY_UI_THEME.accentColor, bold: true }, title),
    h(
      Box,
      { alignItems: 'center', justifyContent: 'space-between', width: '100%' },
      h(
        Box,
        { alignItems: 'center', flexGrow: 1, flexShrink: 1, marginRight: 2 },
        h(Text, { color: HOMEY_UI_THEME.mutedColor }, 'Filter: '),
        h(
          Box,
          { flexShrink: 1 },
          h(
            Text,
            {
              color: query ? HOMEY_UI_THEME.textColor : HOMEY_UI_THEME.mutedColor,
              wrap: 'truncate-end',
            },
            filterText,
          ),
        ),
      ),
      h(Box, { flexShrink: 0 }, h(Text, { color: HOMEY_UI_THEME.mutedColor }, countText)),
    ),
    subtitle ? h(Text, { color: HOMEY_UI_THEME.mutedColor }, subtitle) : null,
  );
}
