import { createElement } from 'react';
import { Box, Text } from 'ink';
import { HomeySelectOverflowMarker } from '../homey-select/HomeySelectOverflowMarker.mjs';
import { HOMEY_UI_THEME } from '../theme.mjs';
import {
  getQuestionCursor,
  getSelectionChoices,
  getVisibleWindow,
} from './homey-app-create-state.mjs';

export function HomeyAppCreateChoices({ answers, cursors, maxVisibleItems, question }) {
  const choices = getSelectionChoices(question);
  const cursor = getQuestionCursor(question, answers, cursors);
  const windowedChoices = getVisibleWindow(choices, cursor, maxVisibleItems);

  return createElement(
    Box,
    {
      flexDirection: 'column',
      width: '100%',
    },
    windowedChoices.hiddenAboveCount > 0
      ? createElement(HomeySelectOverflowMarker, {
          count: windowedChoices.hiddenAboveCount,
          direction: 'above',
        })
      : null,
    ...windowedChoices.items.map((choice, index) => {
      const choiceIndex = windowedChoices.offset + index;
      const isActive = choiceIndex === cursor;
      const isChecked =
        question.type === 'checkbox'
          ? Array.isArray(answers[question.name]) && answers[question.name].includes(choice.value)
          : answers[question.name] === choice.value;
      const indicator =
        question.type === 'checkbox' ? (isChecked ? '●' : '○') : isActive ? '›' : ' ';
      const rowColor = isActive ? HOMEY_UI_THEME.highlight : HOMEY_UI_THEME.text;

      return createElement(
        Box,
        {
          key: `${question.name}:${choice.value}`,
          width: '100%',
        },
        createElement(
          Text,
          {
            color: rowColor,
            wrap: 'truncate-end',
          },
          `${indicator} ${choice.label}`,
        ),
      );
    }),
    windowedChoices.hiddenBelowCount > 0
      ? createElement(HomeySelectOverflowMarker, {
          count: windowedChoices.hiddenBelowCount,
          direction: 'below',
        })
      : null,
  );
}
