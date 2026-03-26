import { HOMEY_UI_THEME } from '../theme.mjs';

const APP_CREATE_FOOTER_SEPARATOR = ` ${HOMEY_UI_THEME.bullet} `;
const MIN_TERMINAL_ROWS = 10;
const HEADER_ROWS = 2;
const FOOTER_ROWS = 1;
const BODY_CHROME_ROWS = 5;

export const APP_CREATE_SURFACE_PROPS = {
  backgroundColor: HOMEY_UI_THEME.selectedBackground,
  paddingX: 2,
  paddingY: 1,
};

export function formatAppCreateStep(stepIndex, totalSteps) {
  return `Step ${stepIndex + 1} of ${totalSteps}`;
}

export function getAppCreateSubtitle(question) {
  if (!question) {
    return '';
  }

  if (question.type === 'review') {
    return 'Review answers';
  }

  return question.message;
}

export function getAppCreateFooterText(question) {
  if (!question) {
    return '';
  }

  if (question.type === 'checkbox') {
    return ['↑/↓ move', 'Space toggle', 'Enter next', 'Esc back', 'Ctrl+C cancel'].join(
      APP_CREATE_FOOTER_SEPARATOR,
    );
  }

  if (question.type === 'list' || question.type === 'confirm') {
    return ['↑/↓ move', 'Enter next', 'Esc back', 'Ctrl+C cancel'].join(
      APP_CREATE_FOOTER_SEPARATOR,
    );
  }

  if (question.type === 'review') {
    return ['Esc back', 'Ctrl+C cancel'].join(APP_CREATE_FOOTER_SEPARATOR);
  }

  return ['Enter next', 'Esc back', 'Ctrl+C cancel'].join(APP_CREATE_FOOTER_SEPARATOR);
}

export function getAppCreateLayout({ terminalRows = 24 }) {
  const safeTerminalRows = Math.max(MIN_TERMINAL_ROWS, terminalRows || 24);

  return {
    maxVisibleItems: Math.max(3, safeTerminalRows - HEADER_ROWS - FOOTER_ROWS - BODY_CHROME_ROWS),
    terminalRows: safeTerminalRows,
  };
}
