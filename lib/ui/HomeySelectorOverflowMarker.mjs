import React from 'react';
import { Box, Text } from 'ink';
import { HOMEY_UI_THEME } from './theme.mjs';
import { formatOverflowMarkerLabel } from './homey-selector-view.mjs';

const h = React.createElement;

export function HomeySelectorOverflowMarker({ count, direction }) {
  return h(
    Box,
    {
      justifyContent: 'center',
      width: '100%',
    },
    h(
      Text,
      { color: HOMEY_UI_THEME.mutedColor, wrap: 'truncate-end' },
      formatOverflowMarkerLabel(direction, count),
    ),
  );
}
