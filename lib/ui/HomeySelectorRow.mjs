import React from 'react';
import { Box, Text } from 'ink';
import { useHomeySelectorRowModel } from './homey-selector-store.mjs';
import { HOMEY_UI_THEME } from './theme.mjs';
import { getResponsiveBadgeVisibility } from './homey-selector-view.mjs';

const h = React.createElement;

function Badge({ color, label }) {
  return h(Text, { color }, `[${label}]`);
}

export function HomeySelectorRow({ rowContentWidth, rowId }) {
  const rowModel = useHomeySelectorRowModel(rowId);

  if (!rowModel) {
    return null;
  }

  const { homey, isCurrent, isSelected } = rowModel;
  const titleColor = isSelected ? HOMEY_UI_THEME.accentColor : HOMEY_UI_THEME.textColor;
  const rowBackgroundColor = isSelected ? HOMEY_UI_THEME.selectionBackgroundColor : undefined;
  const { showCurrent, showPlatform } = getResponsiveBadgeVisibility({
    availableWidth: rowContentWidth,
    isCurrent,
    platform: homey.platform,
  });

  return h(
    Box,
    {
      alignItems: 'center',
      backgroundColor: rowBackgroundColor,
      justifyContent: 'space-between',
      paddingX: 2,
      width: '100%',
    },
    h(
      Box,
      { flexGrow: 1, flexShrink: 1, marginRight: 1 },
      h(
        Text,
        { color: titleColor, bold: isSelected, wrap: 'truncate-end' },
        homey.name ?? 'Unknown Homey',
      ),
    ),
    h(
      Box,
      { flexShrink: 0 },
      showCurrent
        ? h(
            Text,
            null,
            h(Badge, {
              color: HOMEY_UI_THEME.currentColor,
              label: 'current',
            }),
            showPlatform ? ' ' : '',
          )
        : null,
      showPlatform
        ? h(Badge, {
            color: HOMEY_UI_THEME.platformColor,
            label: homey.platform,
          })
        : null,
    ),
  );
}
