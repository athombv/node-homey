import { createElement } from 'react';
import { Box, Text } from 'ink';
import { HOMEY_UI_THEME } from '../theme.mjs';
import { getReviewSections } from './homey-driver-create-state.mjs';

export function HomeyDriverCreateReview({ answers, questionDefinitions }) {
  const sections = getReviewSections(questionDefinitions, answers);

  return createElement(
    Box,
    {
      flexDirection: 'column',
      width: '100%',
    },
    createElement(
      Text,
      {
        wrap: 'truncate-end',
      },
      createElement(Text, { color: HOMEY_UI_THEME.textLight }, '┌ '),
      createElement(Text, { color: HOMEY_UI_THEME.highlight, bold: true }, 'Details'),
    ),
    createElement(Text, { color: HOMEY_UI_THEME.textLight }, '│'),
    ...sections.flatMap((section) => {
      return [
        createElement(
          Text,
          {
            key: `${section.title}:title`,
            wrap: 'truncate-end',
          },
          createElement(Text, { color: HOMEY_UI_THEME.highlight }, '● '),
          createElement(Text, { bold: true, color: HOMEY_UI_THEME.highlight }, section.title),
        ),
        ...section.items.flatMap((item) => {
          return [
            createElement(
              Text,
              {
                key: `${item.key}:value`,
                wrap: 'truncate-end',
              },
              createElement(Text, { color: HOMEY_UI_THEME.textLight }, '  - '),
              createElement(Text, { bold: true, color: HOMEY_UI_THEME.text }, item.label),
              createElement(Text, { color: HOMEY_UI_THEME.textLight }, ': '),
              createElement(Text, { color: HOMEY_UI_THEME.text }, item.value),
            ),
          ];
        }),
        createElement(
          Text,
          { color: HOMEY_UI_THEME.textLight, key: `${section.title}:divider` },
          '│',
        ),
      ];
    }),
    createElement(
      Text,
      { wrap: 'truncate-end' },
      createElement(Text, { color: HOMEY_UI_THEME.textLight }, '└ '),
      createElement(Text, { color: HOMEY_UI_THEME.success }, 'Hit Enter to create'),
    ),
  );
}
