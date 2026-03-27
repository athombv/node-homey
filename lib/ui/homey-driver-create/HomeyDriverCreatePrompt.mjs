import { createElement } from 'react';
import { Box } from 'ink';
import TextInput from 'ink-text-input';
import { DRIVER_CREATE_SURFACE_PROPS } from './homey-driver-create-view.mjs';
import { HomeyDriverCreateChoices } from './HomeyDriverCreateChoices.mjs';
import { HomeyDriverCreateReview } from './HomeyDriverCreateReview.mjs';
import { isSelectionQuestionType } from './homey-driver-create-state.mjs';

export function HomeyDriverCreatePrompt({
  answers,
  cursors,
  maxVisibleItems,
  onInputChange,
  onInputSubmit,
  queries,
  question,
  questionDefinitions,
  width,
}) {
  let content;

  if (question.type === 'review') {
    content = createElement(HomeyDriverCreateReview, {
      answers,
      questionDefinitions,
    });
  } else if (isSelectionQuestionType(question.type)) {
    content = createElement(HomeyDriverCreateChoices, {
      answers,
      cursors,
      maxVisibleItems,
      queries,
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
        placeholder: question.placeholder ?? 'Type a value',
        showCursor: true,
        value: String(answers[question.name] ?? ''),
      }),
    );
  }

  return createElement(
    Box,
    {
      ...DRIVER_CREATE_SURFACE_PROPS,
      marginTop: 1,
      width,
    },
    content,
  );
}
