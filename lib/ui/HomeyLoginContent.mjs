import React from 'react';
import { Box, Text } from 'ink';
import { HomeyLoginCodeInput } from './HomeyLoginCodeInput.mjs';
import {
  formatCenteredText,
  getHomeyLoginPhaseMessage,
  getHomeyLoginPhaseTitle,
} from './homey-login-view.mjs';
import { HOMEY_UI_THEME } from './theme.mjs';

const h = React.createElement;

function HomeyLoginCenteredText({ bold = false, color, value, width, wrap = 'wrap' }) {
  return h(
    Box,
    { width: '100%' },
    h(
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
    phase === 'error' || phase === 'timeout'
      ? HOMEY_UI_THEME.dangerColor
      : HOMEY_UI_THEME.textColor;
  const showInput = phase === 'waiting_for_code';
  const showUrl = phase === 'opening_browser' || phase === 'waiting_for_code';

  return h(
    Box,
    {
      alignItems: 'center',
      flexDirection: 'column',
      paddingX: contentSidePadding,
      width: contentWidth,
    },
    h(HomeyLoginCenteredText, {
      bold: true,
      color: HOMEY_UI_THEME.accentColor,
      value: phaseTitle,
      width: contentInnerWidth,
      wrap: 'truncate-end',
    }),
    h(
      Box,
      {
        alignItems: 'center',
        flexDirection: 'column',
        marginTop: 1,
        width: '100%',
      },
      h(HomeyLoginCenteredText, {
        color: messageColor,
        value: phaseMessage,
        width: contentInnerWidth,
      }),
      showUrl
        ? h(
            Box,
            {
              alignItems: 'center',
              flexDirection: 'column',
              marginTop: 1,
              width: '100%',
            },
            h(HomeyLoginCenteredText, {
              color: HOMEY_UI_THEME.platformColor,
              value: url,
              width: contentInnerWidth,
            }),
          )
        : null,
      showInput ? h(HomeyLoginCodeInput, { code }) : null,
    ),
  );
}
