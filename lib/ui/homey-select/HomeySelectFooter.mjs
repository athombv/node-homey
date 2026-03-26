import { createElement } from 'react';
import { Box, Text } from 'ink';
import {
  selectHomeySelectHasInteractiveHomeys,
  selectHomeySelectVisibleCount,
  useHomeySelectStore,
} from './homey-select-store.mjs';
import { getSelectFooterText } from './homey-select-view.mjs';
import { HOMEY_UI_THEME } from '../theme.mjs';

export function HomeySelectFooter() {
  const hasInteractiveHomeys = useHomeySelectStore(selectHomeySelectHasInteractiveHomeys);
  const isLoading = useHomeySelectStore((state) => state.isLoading);
  const query = useHomeySelectStore((state) => state.query);
  const visibleCount = useHomeySelectStore(selectHomeySelectVisibleCount);
  const text = getSelectFooterText({
    hasInteractiveHomeys,
    isLoading,
    query,
    visibleCount,
  });

  return createElement(
    Box,
    null,
    createElement(Text, { color: HOMEY_UI_THEME.textLight, wrap: 'truncate-end' }, text),
  );
}
