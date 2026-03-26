import { createElement } from 'react';
import { Box } from 'ink';
import TextInput from 'ink-text-input';
import { HomeyAppCreateChoices } from './HomeyAppCreateChoices.mjs';
import { HomeyAppCreateReview } from './HomeyAppCreateReview.mjs';
import { APP_CREATE_SURFACE_PROPS } from './homey-app-create-view.mjs';

export function HomeyAppCreatePrompt({
  answers,
  cursors,
  maxVisibleItems,
  onInputChange,
  onInputSubmit,
  question,
  questionGroups,
  width,
}) {
  let content;

  if (question.type === 'review') {
    content = createElement(HomeyAppCreateReview, {
      answers,
      questionGroups,
    });
  } else if (
    question.type === 'list' ||
    question.type === 'checkbox' ||
    question.type === 'confirm'
  ) {
    content = createElement(HomeyAppCreateChoices, {
      answers,
      cursors,
      maxVisibleItems,
      question,
    });
  } else {
    content = createElement(
      Box,
      {
        width: '100%',
      },
      createElement(TextInput, {
        focus: true,
        key: question.name,
        onChange(value) {
          onInputChange(question.name, value);
        },
        onSubmit: onInputSubmit,
        placeholder: 'Type a value',
        showCursor: true,
        value: String(answers[question.name] ?? ''),
      }),
    );
  }

  return createElement(
    Box,
    {
      ...APP_CREATE_SURFACE_PROPS,
      marginTop: 1,
      width,
    },
    content,
  );
}
