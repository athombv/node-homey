import { createElement } from 'react';
import { Box, Text } from 'ink';
import { HOMEY_UI_THEME } from '../theme.mjs';

export function HomeySelectLoadingState() {
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
    createElement(Text, { color: HOMEY_UI_THEME.textLight }, 'Loading Homeys...'),
  );
}
