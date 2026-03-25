import React from 'react';
import { Box, Text } from 'ink';
import { HOMEY_UI_THEME } from './theme.mjs';

const h = React.createElement;

export function HomeySelectorEmptyState({ hasInteractiveHomeys, query }) {
  const content = !hasInteractiveHomeys
    ? [
        h(
          Text,
          {
            color: HOMEY_UI_THEME.emptyColor,
          },
          'No online Homeys are available for interactive selection.',
        ),
        h(Text, { color: HOMEY_UI_THEME.mutedColor }, 'Press Esc or Ctrl+C to cancel.'),
      ]
    : [
        h(Text, { color: HOMEY_UI_THEME.emptyColor }, `No matches for "${query}".`),
        h(Text, { color: HOMEY_UI_THEME.mutedColor }, 'Press Esc to clear the query.'),
      ];

  return h(
    Box,
    {
      alignItems: 'center',
      flexDirection: 'column',
      flexGrow: 1,
      justifyContent: 'flex-start',
      paddingTop: 1,
      width: '100%',
    },
    ...content,
  );
}
