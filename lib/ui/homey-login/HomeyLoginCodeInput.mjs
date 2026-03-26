import { createElement } from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';
import { HOMEY_UI_THEME } from '../theme.mjs';

export function HomeyLoginCodeInput({ code, focus = true, onChange, onSubmit }) {
  return createElement(
    Box,
    {
      backgroundColor: HOMEY_UI_THEME.selectedBackground,
      marginTop: 1,
      paddingY: 1,
      paddingX: 2,
      width: '100%',
    },
    createElement(
      Box,
      {
        justifyContent: 'center',
        width: '100%',
      },
      createElement(Text, { color: HOMEY_UI_THEME.textLight }, 'Code: '),
      createElement(TextInput, {
        focus,
        onChange,
        onSubmit,
        placeholder: 'Paste authorization code',
        showCursor: code.length > 0,
        value: code,
      }),
    ),
  );
}
