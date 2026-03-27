import { HOMEY_UI_THEME } from '../theme.mjs';

const FOOTER_SEPARATOR = ` ${HOMEY_UI_THEME.bullet} `;
const MIN_TERMINAL_ROWS = 10;
const HEADER_ROWS = 2;
const FOOTER_ROWS = 1;
const BODY_CHROME_ROWS = 5;

export const DRIVER_CREATE_SURFACE_PROPS = {
  backgroundColor: HOMEY_UI_THEME.selectedBackground,
  paddingX: 2,
  paddingY: 1,
};

export function formatDriverCreateStep(stepIndex, totalSteps) {
  return `Step ${stepIndex + 1} of ${totalSteps}`;
}

export function getDriverCreateSubtitle(question) {
  if (!question) {
    return '';
  }

  if (question.type === 'review') {
    return 'Review answers';
  }

  return question.message;
}

export function getDriverCreateFooterText(question, query = '') {
  if (!question) {
    return '';
  }

  const escapeLabel = query ? 'Esc clear' : 'Esc back';
  const isSearchable = Boolean(question.searchable);

  if (question.type === 'checkbox' || question.type === 'searchable-checkbox') {
    const parts = ['↑/↓ move'];

    if (isSearchable && !query) {
      parts.push('type to filter');
    }

    parts.push('Space toggle', 'Enter next', escapeLabel, 'Ctrl+C cancel');
    return parts.join(FOOTER_SEPARATOR);
  }

  if (
    question.type === 'list' ||
    question.type === 'searchable-list' ||
    question.type === 'confirm'
  ) {
    const parts = ['↑/↓ move'];

    if (isSearchable && !query) {
      parts.push('type to filter');
    }

    parts.push('Enter next', escapeLabel, 'Ctrl+C cancel');
    return parts.join(FOOTER_SEPARATOR);
  }

  if (question.type === 'review') {
    return ['Esc back', 'Ctrl+C cancel'].join(FOOTER_SEPARATOR);
  }

  return ['Enter next', 'Esc back', 'Ctrl+C cancel'].join(FOOTER_SEPARATOR);
}

export function getDriverCreateLayout({ terminalRows = 24 }) {
  const safeTerminalRows = Math.max(MIN_TERMINAL_ROWS, terminalRows || 24);

  return {
    maxVisibleItems: Math.max(3, safeTerminalRows - HEADER_ROWS - FOOTER_ROWS - BODY_CHROME_ROWS),
    terminalRows: safeTerminalRows,
  };
}
