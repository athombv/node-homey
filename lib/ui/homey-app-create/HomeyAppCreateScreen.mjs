import { createElement, useEffect, useState } from 'react';
import { Box, Text, useInput, useStdout } from 'ink';
import { HOMEY_UI_THEME } from '../theme.mjs';
import {
  createInitialAnswers,
  getApplicableQuestions,
  getQuestionCursor,
  getQuestions,
  getSelectionChoices,
  toValidationMessage,
} from './homey-app-create-state.mjs';
import { HomeyAppCreateFooter } from './HomeyAppCreateFooter.mjs';
import { HomeyAppCreateHeader } from './HomeyAppCreateHeader.mjs';
import { HomeyAppCreatePrompt } from './HomeyAppCreatePrompt.mjs';
import { getAppCreateLayout, getAppCreateSubtitle } from './homey-app-create-view.mjs';

export function HomeyAppCreateScreen({ finalize, questionGroups, title }) {
  const { stdout } = useStdout();
  const [answers, setAnswers] = useState(() => createInitialAnswers(questionGroups));
  const [cursors, setCursors] = useState({});
  const [error, setError] = useState(null);
  const [stepIndex, setStepIndex] = useState(0);
  const questions = getQuestions(questionGroups, answers);
  const currentQuestion = questions[stepIndex];
  const layout = getAppCreateLayout({
    terminalRows: stdout.rows,
  });
  const contentWidth = '100%';
  const maxVisibleItems = layout.maxVisibleItems;

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
    }

    if (currentQuestion.type === 'list' || currentQuestion.type === 'confirm') {
      const choices = getSelectionChoices(currentQuestion);
      const currentCursor = getQuestionCursor(currentQuestion, answers, cursors);
      const selectedChoice = choices[currentCursor];

      validationValue = selectedChoice?.value;
      nextAnswers = {
        ...answers,
        [currentQuestion.name]: selectedChoice?.value,
      };

      setAnswers((currentAnswers) => {
        return currentAnswers[currentQuestion.name] === selectedChoice?.value
          ? currentAnswers
          : {
              ...currentAnswers,
              [currentQuestion.name]: selectedChoice?.value,
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

      getApplicableQuestions(questionGroups, currentAnswers).forEach((question) => {
        if (Object.prototype.hasOwnProperty.call(nextAnswers, question.name)) {
          return;
        }

        nextAnswers[question.name] =
          nextAnswers[question.name] ??
          (typeof question.default === 'function'
            ? question.default(nextAnswers)
            : (question.default ?? (question.type === 'checkbox' ? [] : '')));
        changed = true;
      });

      return changed ? nextAnswers : currentAnswers;
    });
  }, [questionGroups, answers['programming-language']]);

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

    if (
      currentQuestion.type === 'list' ||
      currentQuestion.type === 'checkbox' ||
      currentQuestion.type === 'confirm'
    ) {
      const choices = getSelectionChoices(currentQuestion);
      const currentCursor = getQuestionCursor(currentQuestion, answers, cursors);

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

      if (currentQuestion.type === 'checkbox' && input === ' ') {
        const toggledChoice = choices[currentCursor];
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
    createElement(HomeyAppCreateHeader, {
      stepIndex,
      subtitle: getAppCreateSubtitle(currentQuestion),
      title,
      totalSteps: questions.length,
    }),
    createElement(
      Box,
      {
        flexDirection: 'column',
        flexGrow: 1,
      },
      createElement(HomeyAppCreatePrompt, {
        answers,
        cursors,
        maxVisibleItems,
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
        question: currentQuestion,
        questionGroups,
        width: contentWidth,
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
    createElement(HomeyAppCreateFooter, {
      question: currentQuestion,
    }),
  );
}
