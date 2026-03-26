import { createElement } from 'react';
import { Box, Text } from 'ink';
import { useHomeySelectRowModel } from './homey-select-store.mjs';
import { HOMEY_UI_THEME } from '../theme.mjs';
import { getResponsiveBadgeVisibility } from './homey-select-view.mjs';

function Badge({ color, label }) {
  return createElement(Text, { color }, `[${label}]`);
}

export function HomeySelectRow({ rowContentWidth, rowId }) {
  const rowModel = useHomeySelectRowModel(rowId);

  if (!rowModel) {
    return null;
  }

  const { homey, isCurrent, isSelected } = rowModel;
  const titleColor = isSelected ? HOMEY_UI_THEME.highlight : HOMEY_UI_THEME.text;
  const rowBackgroundColor = isSelected ? HOMEY_UI_THEME.selectedBackground : undefined;
  const { showCurrent, showPlatform } = getResponsiveBadgeVisibility({
    availableWidth: rowContentWidth,
    isCurrent,
    platform: homey.platform,
  });

  return createElement(
    Box,
    {
      alignItems: 'center',
      backgroundColor: rowBackgroundColor,
      justifyContent: 'space-between',
      paddingX: 2,
      width: '100%',
    },
    createElement(
      Box,
      { flexGrow: 1, flexShrink: 1, marginRight: 1 },
      createElement(
        Text,
        { color: titleColor, bold: isSelected, wrap: 'truncate-end' },
        homey.name ?? 'Unknown Homey',
      ),
    ),
    createElement(
      Box,
      { flexShrink: 0 },
      showCurrent
        ? createElement(
            Text,
            null,
            createElement(Badge, {
              color: HOMEY_UI_THEME.success,
              label: 'current',
            }),
            showPlatform ? ' ' : '',
          )
        : null,
      showPlatform
        ? createElement(Badge, {
            color: HOMEY_UI_THEME.textLightHover,
            label: homey.platform,
          })
        : null,
    ),
  );
}
