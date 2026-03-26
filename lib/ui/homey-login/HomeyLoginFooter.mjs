import { createElement } from 'react';
import { Box, Text } from 'ink';
import { formatCenteredText } from './homey-login-view.mjs';
import { HOMEY_UI_THEME } from '../theme.mjs';

export function HomeyLoginFooter({ text, width }) {
  if (!text) {
    return null;
  }

  return createElement(
    Box,
    { width },
    createElement(
      Text,
      {
        color: HOMEY_UI_THEME.textLight,
        wrap: 'truncate-end',
      },
      formatCenteredText(text, width, 'truncate-end'),
    ),
  );
}
