import { createElement } from 'react';
import { Box, Text } from 'ink';
import { HOMEY_UI_THEME } from '../theme.mjs';
import { getAppCreateFooterText } from './homey-app-create-view.mjs';

export function HomeyAppCreateFooter({ question }) {
  const text = getAppCreateFooterText(question);

  if (!text) {
    return null;
  }

  return createElement(
    Box,
    {
      width: '100%',
    },
    createElement(
      Text,
      {
        color: HOMEY_UI_THEME.textLight,
        wrap: 'truncate-end',
      },
      text,
    ),
  );
}
