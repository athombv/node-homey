import React from 'react';
import { Box, Text } from 'ink';
import { HOMEY_UI_THEME } from './theme.mjs';

const h = React.createElement;

export function HomeySelectorLoadingState() {
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
    h(Text, { color: HOMEY_UI_THEME.mutedColor }, 'Loading Homeys...'),
  );
}
