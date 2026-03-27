import { createElement } from 'react';
import { Box, Text } from 'ink';
import { HomeySelectOverflowMarker } from '../homey-select/HomeySelectOverflowMarker.mjs';
import { HOMEY_UI_THEME } from '../theme.mjs';
import { getQuestionQuery, getQuestionWindowState } from './homey-driver-create-state.mjs';

function HomeyDriverCreateEmptyState({ query }) {
  return createElement(
    Box,
    {
      flexDirection: 'column',
      width: '100%',
    },
    query
      ? createElement(Text, { color: HOMEY_UI_THEME.warning }, `No matches for "${query}".`)
      : createElement(Text, { color: HOMEY_UI_THEME.textLight }, 'No options available.'),
    createElement(
      Text,
      { color: HOMEY_UI_THEME.textLight },
      query ? 'Press Esc to clear the query.' : 'Press Esc to go back.',
    ),
  );
}

export function HomeyDriverCreateChoices({ answers, cursors, maxVisibleItems, queries, question }) {
  const query = getQuestionQuery(question, queries);
  const windowState = getQuestionWindowState(question, answers, cursors, maxVisibleItems, queries);

  if (windowState.filteredChoices.length === 0) {
    return createElement(HomeyDriverCreateEmptyState, {
      query,
    });
  }

  return createElement(
    Box,
    {
      flexDirection: 'column',
      width: '100%',
    },
    question.searchable
      ? createElement(
          Box,
          {
            marginBottom: 1,
            width: '100%',
          },
          createElement(Text, { color: HOMEY_UI_THEME.textLight }, 'Filter: '),
          createElement(
            Text,
            {
              color: query ? HOMEY_UI_THEME.text : HOMEY_UI_THEME.textLight,
              wrap: 'truncate-end',
            },
            query || 'all options',
          ),
        )
      : null,
    windowState.hiddenAboveCount > 0
      ? createElement(HomeySelectOverflowMarker, {
          count: windowState.hiddenAboveCount,
          direction: 'above',
        })
      : null,
    ...windowState.visibleChoices.map((choice, index) => {
      const choiceIndex = windowState.hiddenAboveCount > 0 ? index : index;
      const absoluteIndex = windowState.filteredChoices.findIndex(
        (entry) => entry.value === choice.value,
      );
      const isActive = absoluteIndex === windowState.cursor;
      const isChecked =
        question.type === 'checkbox' || question.type === 'searchable-checkbox'
          ? Array.isArray(answers[question.name]) && answers[question.name].includes(choice.value)
          : answers[question.name] === choice.value;
      const indicator =
        question.type === 'checkbox' || question.type === 'searchable-checkbox'
          ? isChecked
            ? '●'
            : '○'
          : isActive
            ? '›'
            : ' ';
      const color = isActive ? HOMEY_UI_THEME.highlight : HOMEY_UI_THEME.text;

      return createElement(
        Box,
        {
          key: `${question.name}:${choice.value}:${choiceIndex}`,
          width: '100%',
        },
        createElement(
          Text,
          {
            color,
            wrap: 'truncate-end',
          },
          `${indicator} ${choice.label}`,
        ),
      );
    }),
    windowState.hiddenBelowCount > 0
      ? createElement(HomeySelectOverflowMarker, {
          count: windowState.hiddenBelowCount,
          direction: 'below',
        })
      : null,
  );
}
