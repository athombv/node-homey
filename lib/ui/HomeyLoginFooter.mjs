import React from 'react';
import { Box, Text } from 'ink';
import { formatCenteredText } from './homey-login-view.mjs';
import { HOMEY_UI_THEME } from './theme.mjs';

const h = React.createElement;

export function HomeyLoginFooter({ text, width }) {
  if (!text) {
    return null;
  }

  return h(
    Box,
    { width },
    h(
      Text,
      {
        color: HOMEY_UI_THEME.mutedColor,
        wrap: 'truncate-end',
      },
      formatCenteredText(text, width, 'truncate-end'),
    ),
  );
}
