import { createElement } from 'react';
import { Box, Text } from 'ink';
import { HOMEY_UI_THEME } from '../theme.mjs';

export function HomeySelectEmptyState({ hasInteractiveHomeys, query }) {
  const content = !hasInteractiveHomeys
    ? [
        createElement(
          Text,
          {
            color: HOMEY_UI_THEME.warning,
          },
          'No online Homeys are available for interactive selection.',
        ),
        createElement(Text, { color: HOMEY_UI_THEME.textLight }, 'Press Esc or Ctrl+C to cancel.'),
      ]
    : [
        createElement(Text, { color: HOMEY_UI_THEME.warning }, `No matches for "${query}".`),
        createElement(Text, { color: HOMEY_UI_THEME.textLight }, 'Press Esc to clear the query.'),
      ];

  return createElement(
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
