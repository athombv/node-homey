import { createElement } from 'react';
import { Box, Text } from 'ink';
import { HOMEY_UI_THEME } from '../theme.mjs';
import { formatAppCreateStep } from './homey-app-create-view.mjs';

export function HomeyAppCreateHeader({ stepIndex, subtitle, title, totalSteps }) {
  return createElement(
    Box,
    {
      flexDirection: 'column',
      width: '100%',
    },
    createElement(
      Box,
      {
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
      },
      createElement(
        Box,
        {
          flexGrow: 1,
          flexShrink: 1,
          marginRight: 2,
        },
        createElement(
          Text,
          {
            bold: true,
            color: HOMEY_UI_THEME.highlight,
            wrap: 'truncate-end',
          },
          title,
        ),
      ),
      createElement(
        Box,
        {
          flexShrink: 0,
        },
        createElement(
          Text,
          {
            color: HOMEY_UI_THEME.textLight,
          },
          formatAppCreateStep(stepIndex, totalSteps),
        ),
      ),
    ),
    subtitle
      ? createElement(
          Text,
          {
            color: HOMEY_UI_THEME.textLight,
            wrap: 'truncate-end',
          },
          subtitle,
        )
      : null,
  );
}
