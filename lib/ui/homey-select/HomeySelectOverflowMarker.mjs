import { createElement } from 'react';
import { Box, Text } from 'ink';
import { HOMEY_UI_THEME } from '../theme.mjs';
import { formatOverflowMarkerLabel } from './homey-select-view.mjs';

export function HomeySelectOverflowMarker({ count, direction }) {
  return createElement(
    Box,
    {
      justifyContent: 'center',
      width: '100%',
    },
    createElement(
      Text,
      { color: HOMEY_UI_THEME.textLight, wrap: 'truncate-end' },
      formatOverflowMarkerLabel(direction, count),
    ),
  );
}
