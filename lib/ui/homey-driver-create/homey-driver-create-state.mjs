import {
  appendQueryInput,
  filterChoicesByQuery,
  getInitialChoiceCursor,
  getVisibleChoiceWindowState,
  normalizeChoices,
  removeLastQueryCharacter,
} from '../choice-picker/choice-picker-state.mjs';

export const REVIEW_STEP_NAME = '__review';

const CONFIRM_CHOICES = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
];

export function isSelectionQuestionType(type) {
  return ['checkbox', 'confirm', 'list', 'searchable-checkbox', 'searchable-list'].includes(type);
}

export function getQuestionChoices(question, answers = {}) {
  const rawChoices =
    typeof question.choices === 'function' ? question.choices(answers) : question.choices;
  return normalizeChoices(Array.isArray(rawChoices) ? rawChoices : []);
}

export function getQuestionDefaultValue(question, answers = {}) {
  const rawDefaultValue =
    typeof question.default === 'function' ? question.default(answers) : question.default;

  if (question.type === 'checkbox' || question.type === 'searchable-checkbox') {
    if (Array.isArray(rawDefaultValue)) {
      return rawDefaultValue;
    }

    return getQuestionChoices(question, answers)
      .filter((choice) => choice.checked)
      .map((choice) => choice.value);
  }

  if (question.type === 'confirm') {
    return Boolean(rawDefaultValue);
  }

  if (question.type === 'list' || question.type === 'searchable-list') {
    const choices = getQuestionChoices(question, answers);

    if (typeof rawDefaultValue !== 'undefined') {
      return rawDefaultValue;
    }

    return choices[0]?.value ?? null;
  }

  return rawDefaultValue ?? '';
}

export function isQuestionApplicable(question, answers = {}) {
  if (typeof question.isApplicable === 'function') {
    return Boolean(question.isApplicable(answers));
  }

  return true;
}

export function getApplicableQuestions(questionDefinitions = [], answers = {}) {
  return questionDefinitions.filter((question) => isQuestionApplicable(question, answers));
}

export function createInitialAnswers(questionDefinitions = []) {
  const answers = {};
  let changed = true;

  while (changed) {
    changed = false;

    getApplicableQuestions(questionDefinitions, answers).forEach((question) => {
      if (Object.prototype.hasOwnProperty.call(answers, question.name)) {
        return;
      }

      answers[question.name] = getQuestionDefaultValue(question, answers);
      changed = true;
    });
  }

  return answers;
}

export function getQuestions(questionDefinitions = [], answers = {}) {
  return [
    ...getApplicableQuestions(questionDefinitions, answers),
    {
      message: 'Review your driver configuration',
      name: REVIEW_STEP_NAME,
      type: 'review',
    },
  ];
}

export function getSelectionChoices(question, answers = {}) {
  if (question.type === 'confirm') {
    return CONFIRM_CHOICES;
  }

  return getQuestionChoices(question, answers);
}

export function getQuestionQuery(question, queries = {}) {
  return queries[question.name] ?? '';
}

export function getFilteredQuestionChoices(question, answers = {}, queries = {}) {
  const choices = getSelectionChoices(question, answers);

  if (!question.searchable) {
    return choices;
  }

  return filterChoicesByQuery(choices, getQuestionQuery(question, queries));
}

export function getQuestionCursor(question, answers = {}, cursors = {}, queries = {}) {
  const choices = getFilteredQuestionChoices(question, answers, queries);
  const storedCursor = cursors[question.name];

  if (typeof storedCursor === 'number' && storedCursor >= 0 && storedCursor < choices.length) {
    return storedCursor;
  }

  if (question.type === 'confirm') {
    return answers[question.name] ? 0 : 1;
  }

  return getInitialChoiceCursor({
    choices,
    checkedValues: Array.isArray(answers[question.name]) ? answers[question.name] : [],
    selectedValue:
      question.type === 'checkbox' || question.type === 'searchable-checkbox'
        ? null
        : answers[question.name],
  });
}

export function getQuestionWindowState(
  question,
  answers = {},
  cursors = {},
  maxVisibleItems,
  queries = {},
) {
  const filteredChoices = getFilteredQuestionChoices(question, answers, queries);
  const cursor = getQuestionCursor(question, answers, cursors, queries);
  const windowState = getVisibleChoiceWindowState(filteredChoices, cursor, maxVisibleItems);

  return {
    ...windowState,
    cursor,
    filteredChoices,
  };
}

export function getReviewLabel(question) {
  return question.reviewLabel ?? question.message;
}

export function formatAnswerValue(question, value, answers = {}) {
  if (typeof question.reviewValue === 'function') {
    return question.reviewValue(value, answers);
  }

  if (question.type === 'checkbox' || question.type === 'searchable-checkbox') {
    if (!Array.isArray(value) || value.length === 0) {
      return 'None';
    }

    const choices = getQuestionChoices(question, answers);

    return value
      .map((selectedValue) => {
        return (
          choices.find((choice) => choice.value === selectedValue)?.label ?? String(selectedValue)
        );
      })
      .join(', ');
  }

  if (
    question.type === 'list' ||
    question.type === 'searchable-list' ||
    question.type === 'confirm'
  ) {
    const choices = getSelectionChoices(question, answers);
    const selectedChoice = choices.find((choice) => choice.value === value);
    return selectedChoice?.label ?? value ?? 'None';
  }

  if (typeof value === 'string') {
    return value || 'Empty';
  }

  if (value === null || typeof value === 'undefined') {
    return 'None';
  }

  return String(value);
}

export function getReviewSections(questionDefinitions = [], answers = {}) {
  const sections = [];
  const sectionMap = new Map();

  getApplicableQuestions(questionDefinitions, answers).forEach((question) => {
    const value = answers[question.name];

    if (question.reviewHidden) {
      return;
    }

    if (typeof question.shouldReview === 'function' && !question.shouldReview(value, answers)) {
      return;
    }

    const sectionTitle = question.reviewSection ?? 'Driver';
    let section = sectionMap.get(sectionTitle);

    if (!section) {
      section = {
        items: [],
        title: sectionTitle,
      };
      sectionMap.set(sectionTitle, section);
      sections.push(section);
    }

    section.items.push({
      key: question.name,
      label: getReviewLabel(question),
      value: formatAnswerValue(question, value, answers),
    });
  });

  return sections;
}

export function toValidationMessage(result) {
  if (result === true || typeof result === 'undefined') {
    return null;
  }

  if (result === false) {
    return 'Invalid value.';
  }

  if (result instanceof Error) {
    return result.message;
  }

  return String(result);
}

export const driverCreateQueryUtils = {
  appendQueryInput,
  removeLastQueryCharacter,
};
