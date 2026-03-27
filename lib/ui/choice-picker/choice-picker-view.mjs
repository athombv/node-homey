import { HOMEY_UI_THEME } from '../theme.mjs';

const FOOTER_SEPARATOR = ` ${HOMEY_UI_THEME.bullet} `;
const MIN_TERMINAL_ROWS = 10;
const HEADER_ROWS_WITH_SUBTITLE = 3;
const HEADER_ROWS_WITHOUT_SUBTITLE = 2;
const LIST_GAP_ROWS = 1;
const FOOTER_ROWS = 1;
const ROW_HEIGHT = 1;

export function formatChoiceCountSummary(visibleCount, totalCount, singularLabel, pluralLabel) {
  const resolvedPluralLabel = pluralLabel ?? `${singularLabel}s`;

  if (totalCount === 1) {
    return `1 ${singularLabel}`;
  }

  if (visibleCount === totalCount) {
    return `${totalCount} ${resolvedPluralLabel}`;
  }

  return `${visibleCount} of ${totalCount} ${resolvedPluralLabel}`;
}

export function formatOverflowMarkerLabel(direction, count) {
  return `${count} more ${direction}`;
}

export function getChoicePickerFooterText({
  allowBack = false,
  hasChoices = false,
  mode = 'single',
  query = '',
  searchEnabled = true,
  submitLabel = 'select',
}) {
  const escapeLabel = query ? 'Esc clear' : `Esc ${allowBack ? 'back' : 'cancel'}`;

  if (!hasChoices && query) {
    return ['type to filter', escapeLabel].join(FOOTER_SEPARATOR);
  }

  if (!hasChoices) {
    return [escapeLabel].join(FOOTER_SEPARATOR);
  }

  const parts = ['↑/↓ move'];

  if (searchEnabled && !query) {
    parts.push('type to filter');
  }

  if (mode === 'multi') {
    parts.push('Space toggle');
  }

  parts.push(`Enter ${submitLabel}`);
  parts.push(escapeLabel);

  return parts.join(FOOTER_SEPARATOR);
}

export function getChoicePickerLayout({ hasSubtitle = false, terminalRows = 24 }) {
  const safeTerminalRows = Math.max(MIN_TERMINAL_ROWS, terminalRows || 24);
  const headerRows = hasSubtitle ? HEADER_ROWS_WITH_SUBTITLE : HEADER_ROWS_WITHOUT_SUBTITLE;
  const bodyRows = Math.max(
    ROW_HEIGHT,
    safeTerminalRows - headerRows - LIST_GAP_ROWS - FOOTER_ROWS,
  );

  return {
    listGapRows: LIST_GAP_ROWS,
    maxVisibleRows: Math.max(1, Math.floor(bodyRows / ROW_HEIGHT)),
    terminalRows: safeTerminalRows,
  };
}
