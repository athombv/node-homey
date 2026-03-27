import { createElement, useEffect, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { HOMEY_UI_THEME } from '../theme.mjs';
import { HomeyDriverCreatePrompt } from './HomeyDriverCreatePrompt.mjs';
import {
  createInitialAnswers,
  driverCreateQueryUtils,
  getApplicableQuestions,
  getFilteredQuestionChoices,
  getQuestionCursor,
  getQuestionDefaultValue,
  getQuestionQuery,
  getQuestions,
  isSelectionQuestionType,
  toValidationMessage,
} from './homey-driver-create-state.mjs';
import {
  formatDriverCreateStep,
  getDriverCreateFooterText,
  getDriverCreateLayout,
  getDriverCreateSubtitle,
} from './homey-driver-create-view.mjs';

function HomeyDriverCreateHeader({ question, stepIndex, title, totalSteps }) {
  const subtitle = getDriverCreateSubtitle(question);

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
          formatDriverCreateStep(stepIndex, totalSteps),
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

function HomeyDriverCreateFooter({ question, query }) {
  const text = getDriverCreateFooterText(question, query);

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

export function HomeyDriverCreateScreen({ finalize, questionDefinitions, title }) {
  const { stdout } = useStdout();
  const [answers, setAnswers] = useState(() => createInitialAnswers(questionDefinitions));
  const [cursors, setCursors] = useState({});
  const [error, setError] = useState(null);
  const [queries, setQueries] = useState({});
  const [stepIndex, setStepIndex] = useState(0);
  const questions = getQuestions(questionDefinitions, answers);
  const currentQuestion = questions[stepIndex];
  const layout = getDriverCreateLayout({
    terminalRows: stdout.rows,
  });

  async function submitCurrentQuestion(inputValue) {
    if (!currentQuestion) {
      return;
    }

    if (currentQuestion.type === 'review') {
      finalize({
        answers,
        status: 'submitted',
      });
      return;
    }

    let validationValue = answers[currentQuestion.name];
    let nextAnswers = answers;

    if (currentQuestion.type === 'input' && typeof inputValue === 'string') {
      validationValue = inputValue;
      nextAnswers = {
        ...answers,
        [currentQuestion.name]: inputValue,
      };

      setAnswers((currentAnswers) => {
        return currentAnswers[currentQuestion.name] === inputValue
          ? currentAnswers
          : {
              ...currentAnswers,
              [currentQuestion.name]: inputValue,
            };
      });
    }

    if (
      currentQuestion.type === 'list' ||
      currentQuestion.type === 'searchable-list' ||
      currentQuestion.type === 'confirm'
    ) {
      const choices = getFilteredQuestionChoices(currentQuestion, answers, queries);
      const currentCursor = getQuestionCursor(currentQuestion, answers, cursors, queries);
      const selectedChoice = choices[currentCursor];

      if (!selectedChoice) {
        return;
      }

      validationValue = selectedChoice.value;
      nextAnswers = {
        ...answers,
        [currentQuestion.name]: selectedChoice.value,
      };

      setAnswers((currentAnswers) => {
        return currentAnswers[currentQuestion.name] === selectedChoice.value
          ? currentAnswers
          : {
              ...currentAnswers,
              [currentQuestion.name]: selectedChoice.value,
            };
      });
    }

    if (typeof currentQuestion.validate === 'function') {
      const validationMessage = toValidationMessage(
        await currentQuestion.validate(validationValue, nextAnswers),
      );

      if (validationMessage) {
        setError(validationMessage);
        return;
      }
    }

    setError(null);
    setStepIndex((currentStepIndex) => {
      return Math.min(questions.length - 1, currentStepIndex + 1);
    });
  }

  useEffect(() => {
    setAnswers((currentAnswers) => {
      const nextAnswers = { ...currentAnswers };
      let changed = false;

      getApplicableQuestions(questionDefinitions, currentAnswers).forEach((question) => {
        if (Object.prototype.hasOwnProperty.call(nextAnswers, question.name)) {
          return;
        }

        nextAnswers[question.name] = getQuestionDefaultValue(question, nextAnswers);
        changed = true;
      });

      return changed ? nextAnswers : currentAnswers;
    });
  }, [answers, questionDefinitions]);

  useEffect(() => {
    if (stepIndex <= questions.length - 1) {
      return;
    }

    setStepIndex(questions.length - 1);
  }, [questions.length, stepIndex]);

  useInput((input, key) => {
    if (key.ctrl && input === 'c') {
      finalize({ status: 'cancelled' });
      return;
    }

    if (key.escape || input === '\u001B') {
      if (currentQuestion?.searchable && getQuestionQuery(currentQuestion, queries)) {
        setQueries((currentQueries) => {
          return {
            ...currentQueries,
            [currentQuestion.name]: '',
          };
        });
        setCursors((currentCursors) => {
          return {
            ...currentCursors,
            [currentQuestion.name]: -1,
          };
        });
        return;
      }

      setError(null);

      if (stepIndex === 0) {
        finalize({ status: 'cancelled' });
        return;
      }

      setStepIndex((currentStepIndex) => {
        return Math.max(0, currentStepIndex - 1);
      });
      return;
    }

    if (!currentQuestion) {
      return;
    }

    if (currentQuestion.type === 'input') {
      return;
    }

    if (isSelectionQuestionType(currentQuestion.type)) {
      const choices = getFilteredQuestionChoices(currentQuestion, answers, queries);
      const currentCursor = getQuestionCursor(currentQuestion, answers, cursors, queries);

      if (currentQuestion.searchable && (key.backspace || key.delete)) {
        const nextQuery = driverCreateQueryUtils.removeLastQueryCharacter(
          getQuestionQuery(currentQuestion, queries),
        );

        setQueries((currentQueries) => {
          return {
            ...currentQueries,
            [currentQuestion.name]: nextQuery,
          };
        });
        setCursors((currentCursors) => {
          return {
            ...currentCursors,
            [currentQuestion.name]: -1,
          };
        });
        return;
      }

      if (key.upArrow) {
        setCursors((currentCursors) => {
          return {
            ...currentCursors,
            [currentQuestion.name]: Math.max(0, currentCursor - 1),
          };
        });
        return;
      }

      if (key.downArrow) {
        setCursors((currentCursors) => {
          return {
            ...currentCursors,
            [currentQuestion.name]: Math.min(choices.length - 1, currentCursor + 1),
          };
        });
        return;
      }

      if (
        (currentQuestion.type === 'checkbox' || currentQuestion.type === 'searchable-checkbox') &&
        input === ' '
      ) {
        const toggledChoice = choices[currentCursor];

        if (!toggledChoice) {
          return;
        }

        setAnswers((currentAnswers) => {
          const currentValues = Array.isArray(currentAnswers[currentQuestion.name])
            ? currentAnswers[currentQuestion.name]
            : [];
          const nextValues = currentValues.includes(toggledChoice.value)
            ? currentValues.filter((value) => value !== toggledChoice.value)
            : [...currentValues, toggledChoice.value];

          return {
            ...currentAnswers,
            [currentQuestion.name]: nextValues,
          };
        });
        return;
      }

      if (currentQuestion.type === 'confirm' && input === ' ') {
        setAnswers((currentAnswers) => {
          return {
            ...currentAnswers,
            [currentQuestion.name]: !currentAnswers[currentQuestion.name],
          };
        });
        return;
      }

      if (currentQuestion.searchable) {
        const nextQuery = driverCreateQueryUtils.appendQueryInput(
          getQuestionQuery(currentQuestion, queries),
          input,
          key,
        );

        if (nextQuery !== getQuestionQuery(currentQuestion, queries)) {
          setQueries((currentQueries) => {
            return {
              ...currentQueries,
              [currentQuestion.name]: nextQuery,
            };
          });
          setCursors((currentCursors) => {
            return {
              ...currentCursors,
              [currentQuestion.name]: -1,
            };
          });
          return;
        }
      }
    }

    if (!key.return) {
      return;
    }

    void submitCurrentQuestion();
  });

  return createElement(
    Box,
    {
      flexDirection: 'column',
      height: layout.terminalRows,
      width: '100%',
    },
    createElement(HomeyDriverCreateHeader, {
      question: currentQuestion,
      stepIndex,
      title,
      totalSteps: questions.length,
    }),
    createElement(
      Box,
      {
        flexDirection: 'column',
        flexGrow: 1,
      },
      createElement(HomeyDriverCreatePrompt, {
        answers,
        cursors,
        maxVisibleItems: layout.maxVisibleItems,
        onInputChange(name, value) {
          setAnswers((currentAnswers) => {
            return {
              ...currentAnswers,
              [name]: value,
            };
          });
        },
        onInputSubmit(value) {
          void submitCurrentQuestion(value);
        },
        queries,
        question: currentQuestion,
        questionDefinitions,
        width: '100%',
      }),
      error
        ? createElement(
            Box,
            {
              marginTop: 1,
            },
            createElement(
              Text,
              {
                color: HOMEY_UI_THEME.danger,
                wrap: 'truncate-end',
              },
              error,
            ),
          )
        : null,
    ),
    createElement(HomeyDriverCreateFooter, {
      question: currentQuestion,
      query: currentQuestion ? getQuestionQuery(currentQuestion, queries) : '',
    }),
  );
}
