import React from 'react';
import { Box, Text } from 'ink';
import {
  selectHomeySelectorHasInteractiveHomeys,
  selectHomeySelectorVisibleCount,
  useHomeySelectorStore,
} from './homey-selector-store.mjs';
import { getSelectorFooterText } from './homey-selector-view.mjs';
import { HOMEY_UI_THEME } from './theme.mjs';

const h = React.createElement;

export function HomeySelectorFooter() {
  const hasInteractiveHomeys = useHomeySelectorStore(selectHomeySelectorHasInteractiveHomeys);
  const isLoading = useHomeySelectorStore((state) => state.isLoading);
  const query = useHomeySelectorStore((state) => state.query);
  const visibleCount = useHomeySelectorStore(selectHomeySelectorVisibleCount);
  const text = getSelectorFooterText({
    hasInteractiveHomeys,
    isLoading,
    query,
    visibleCount,
  });

  return h(Box, null, h(Text, { color: HOMEY_UI_THEME.mutedColor, wrap: 'truncate-end' }, text));
}
