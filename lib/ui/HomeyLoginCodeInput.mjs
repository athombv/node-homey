import React from 'react';
import { Box, Text } from 'ink';
import { HOMEY_UI_THEME } from './theme.mjs';

const h = React.createElement;

export function HomeyLoginCodeInput({ code }) {
  return h(
    Box,
    {
      backgroundColor: HOMEY_UI_THEME.selectionBackgroundColor,
      marginTop: 1,
      paddingY: 1,
      paddingX: 2,
      width: '100%',
    },
    h(
      Box,
      {
        justifyContent: 'center',
        width: '100%',
      },
      h(Text, { color: HOMEY_UI_THEME.mutedColor }, 'Code: '),
      h(
        Text,
        {
          color: code ? HOMEY_UI_THEME.textColor : HOMEY_UI_THEME.mutedColor,
          wrap: 'truncate-end',
        },
        code || 'Paste authorization code',
      ),
    ),
  );
}
