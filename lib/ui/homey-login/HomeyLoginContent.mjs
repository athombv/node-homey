import { createElement } from 'react';
import { Box, Text } from 'ink';
import { HomeyLoginCodeInput } from './HomeyLoginCodeInput.mjs';
import {
  formatCenteredText,
  getHomeyLoginPhaseMessage,
  getHomeyLoginPhaseTitle,
} from './homey-login-view.mjs';
import { HOMEY_UI_THEME } from '../theme.mjs';

function HomeyLoginCenteredText({ bold = false, color, value, width, wrap = 'wrap' }) {
  return createElement(
    Box,
    { width: '100%' },
    createElement(
      Text,
      {
        bold,
        color,
        wrap,
      },
      formatCenteredText(value, width, wrap),
    ),
  );
}

export function HomeyLoginContent({
  code,
  contentInnerWidth,
  contentSidePadding,
  contentWidth,
  error,
  inputFocus,
  onCodeChange,
  onCodeSubmit,
  phase,
  profile,
  title,
  url,
}) {
  const phaseTitle = getHomeyLoginPhaseTitle({
    phase,
    title,
  });
  const phaseMessage = getHomeyLoginPhaseMessage({
    error,
    phase,
    profile,
  });
  const messageColor =
    phase === 'error' || phase === 'timeout' ? HOMEY_UI_THEME.danger : HOMEY_UI_THEME.text;
  const showInput = phase === 'waiting_for_code';
  const showUrl = phase === 'opening_browser' || phase === 'waiting_for_code';

  return createElement(
    Box,
    {
      alignItems: 'center',
      flexDirection: 'column',
      paddingX: contentSidePadding,
      width: contentWidth,
    },
    createElement(HomeyLoginCenteredText, {
      bold: true,
      color: HOMEY_UI_THEME.highlight,
      value: phaseTitle,
      width: contentInnerWidth,
      wrap: 'truncate-end',
    }),
    createElement(
      Box,
      {
        alignItems: 'center',
        flexDirection: 'column',
        marginTop: 1,
        width: '100%',
      },
      createElement(HomeyLoginCenteredText, {
        color: messageColor,
        value: phaseMessage,
        width: contentInnerWidth,
      }),
      showUrl
        ? createElement(
            Box,
            {
              alignItems: 'center',
              flexDirection: 'column',
              marginTop: 1,
              width: '100%',
            },
            createElement(HomeyLoginCenteredText, {
              color: HOMEY_UI_THEME.textLightHover,
              value: url,
              width: contentInnerWidth,
            }),
          )
        : null,
      showInput
        ? createElement(HomeyLoginCodeInput, {
            code,
            focus: inputFocus,
            onChange: onCodeChange,
            onSubmit: onCodeSubmit,
          })
        : null,
    ),
  );
}
