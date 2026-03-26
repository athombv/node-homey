import { createElement } from 'react';
import { Box, Text } from 'ink';
import { HOMEY_UI_THEME } from '../theme.mjs';
import {
  formatAnswerValue,
  getApplicableQuestions,
  getReviewLabel,
} from './homey-app-create-state.mjs';

export function HomeyAppCreateReview({ answers, questionGroups }) {
  const questions = getApplicableQuestions(questionGroups, answers);
  const summaryItems = questions.map((question) => {
    return {
      key: question.name,
      label: getReviewLabel(question),
      value: formatAnswerValue(question, answers[question.name]),
    };
  });

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
    ...summaryItems.flatMap((item) => {
      return [
        createElement(
          Text,
          {
            key: `${item.key}:value`,
            wrap: 'truncate-end',
          },
          createElement(
            Text,
            {
              color: HOMEY_UI_THEME.highlight,
            },
            '● ',
          ),
          createElement(Text, { bold: true, color: HOMEY_UI_THEME.text }, item.label),
          createElement(Text, { color: HOMEY_UI_THEME.textLight }, ': '),
          createElement(Text, { color: HOMEY_UI_THEME.text }, item.value),
        ),
        createElement(Text, { color: HOMEY_UI_THEME.textLight, key: `${item.key}:divider` }, '│'),
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
