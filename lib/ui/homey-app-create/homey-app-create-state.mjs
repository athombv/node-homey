export const REVIEW_STEP_NAME = '__review';

const REVIEW_LABELS = {
  appDescription: 'Description',
  appName: 'Name',
  category: 'Category',
  eslint: 'ESLint',
  'github-workflows': 'GitHub workflows',
  id: 'ID',
  license: 'License',
  platforms: 'Platforms',
  'programming-language': 'Language',
};

const CONFIRM_CHOICES = [
  { label: 'Yes', value: true },
  { label: 'No', value: false },
];

const REVIEW_SECTION_ORDER = [
  {
    fields: ['appName', 'appDescription', 'id', 'category', 'platforms'],
    key: 'app',
    title: 'App',
  },
  {
    fields: ['programming-language', 'license'],
    key: 'runtime',
    title: 'Runtime',
  },
  {
    fields: ['github-workflows', 'eslint'],
    key: 'tooling',
    title: 'Tooling',
  },
];

export function normalizeChoice(choice) {
  if (typeof choice === 'string') {
    return {
      checked: false,
      label: choice,
      value: choice,
    };
  }

  return {
    checked: Boolean(choice.checked),
    label: choice.name ?? String(choice.value ?? ''),
    value: choice.value,
  };
}

export function getQuestionChoices(question) {
  return Array.isArray(question.choices) ? question.choices.map(normalizeChoice) : [];
}

export function getQuestionDefaultValue(question, answers = {}) {
  const rawDefaultValue =
    typeof question.default === 'function' ? question.default(answers) : question.default;

  if (question.type === 'checkbox') {
    if (Array.isArray(rawDefaultValue)) {
      return rawDefaultValue;
    }

    return getQuestionChoices(question)
      .filter((choice) => choice.checked)
      .map((choice) => choice.value);
  }

  if (question.type === 'confirm') {
    return Boolean(rawDefaultValue);
  }

  if (question.type === 'list') {
    const choices = getQuestionChoices(question);
    if (typeof rawDefaultValue !== 'undefined') {
      return rawDefaultValue;
    }

    return choices[0]?.value ?? null;
  }

  return rawDefaultValue ?? '';
}

export function getApplicableQuestions(questionGroups, answers = {}) {
  const globalQuestions = questionGroups.globalQuestions ?? [];
  const languageQuestion = globalQuestions.find(
    (question) => question.name === 'programming-language',
  );
  const programmingLanguage =
    answers['programming-language'] ??
    (languageQuestion ? getQuestionDefaultValue(languageQuestion, answers) : 'javascript');
  const localQuestions =
    programmingLanguage === 'python'
      ? (questionGroups.pythonQuestions ?? [])
      : (questionGroups.nodeQuestions ?? []);

  return [...globalQuestions, ...localQuestions];
}

export function createInitialAnswers(questionGroups) {
  const answers = {};
  let changed = true;

  while (changed) {
    changed = false;

    getApplicableQuestions(questionGroups, answers).forEach((question) => {
      if (Object.prototype.hasOwnProperty.call(answers, question.name)) {
        return;
      }

      answers[question.name] = getQuestionDefaultValue(question, answers);
      changed = true;
    });
  }

  return answers;
}

export function getQuestions(questionGroups, answers) {
  return [
    ...getApplicableQuestions(questionGroups, answers),
    {
      message: 'Review your app configuration',
      name: REVIEW_STEP_NAME,
      type: 'review',
    },
  ];
}

export function getSelectionChoices(question) {
  if (question.type === 'confirm') {
    return CONFIRM_CHOICES;
  }

  return getQuestionChoices(question);
}

export function getQuestionCursor(question, answers, cursors) {
  const storedCursor = cursors[question.name];
  const choices = getSelectionChoices(question);

  if (typeof storedCursor === 'number' && storedCursor >= 0 && storedCursor < choices.length) {
    return storedCursor;
  }

  if (question.type === 'confirm') {
    return answers[question.name] ? 0 : 1;
  }

  if (question.type === 'list') {
    const selectedIndex = choices.findIndex((choice) => choice.value === answers[question.name]);
    return selectedIndex >= 0 ? selectedIndex : 0;
  }

  return 0;
}

export function getVisibleWindow(items, cursor, maxVisibleItems) {
  if (items.length <= maxVisibleItems) {
    return {
      hiddenAboveCount: 0,
      hiddenBelowCount: 0,
      items,
      offset: 0,
    };
  }

  const halfWindow = Math.floor(maxVisibleItems / 2);
  let offset = Math.max(0, cursor - halfWindow);
  offset = Math.min(offset, items.length - maxVisibleItems);

  return {
    hiddenAboveCount: offset,
    hiddenBelowCount: items.length - offset - maxVisibleItems,
    items: items.slice(offset, offset + maxVisibleItems),
    offset,
  };
}

export function formatAnswerValue(question, value) {
  if (question.type === 'checkbox') {
    if (!Array.isArray(value) || value.length === 0) {
      return 'None';
    }

    const choices = getQuestionChoices(question);

    return value
      .map((selectedValue) => {
        return (
          choices.find((choice) => choice.value === selectedValue)?.label ?? String(selectedValue)
        );
      })
      .join(', ');
  }

  if (question.type === 'confirm') {
    return value ? 'Yes' : 'No';
  }

  if (question.type === 'list') {
    const selectedChoice = getQuestionChoices(question).find((choice) => choice.value === value);
    return selectedChoice?.label ?? String(value ?? 'None');
  }

  if (typeof value === 'string') {
    return value || 'Empty';
  }

  if (value === null || typeof value === 'undefined') {
    return 'None';
  }

  return String(value);
}

export function getReviewLabel(question) {
  return REVIEW_LABELS[question.name] ?? question.message;
}

export function getReviewSections(questionGroups, answers) {
  const questions = getApplicableQuestions(questionGroups, answers);
  const questionsByName = new Map(
    questions.map((question) => {
      return [question.name, question];
    }),
  );
  const usedQuestionNames = new Set();
  const sections = REVIEW_SECTION_ORDER.map((section) => {
    const items = section.fields.flatMap((questionName) => {
      const question = questionsByName.get(questionName);

      if (!question) {
        return [];
      }

      usedQuestionNames.add(question.name);

      return [
        {
          key: question.name,
          label: getReviewLabel(question),
          value: formatAnswerValue(question, answers[question.name]),
        },
      ];
    });

    if (items.length === 0) {
      return null;
    }

    return {
      items,
      key: section.key,
      title: section.title,
    };
  }).filter(Boolean);

  const remainingItems = questions
    .filter((question) => !usedQuestionNames.has(question.name))
    .map((question) => {
      return {
        key: question.name,
        label: getReviewLabel(question),
        value: formatAnswerValue(question, answers[question.name]),
      };
    });

  if (remainingItems.length > 0) {
    sections.push({
      items: remainingItems,
      key: 'other',
      title: 'More',
    });
  }

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
