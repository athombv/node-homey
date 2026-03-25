import stringWidth from 'string-width';

const DEFAULT_TERMINAL_COLUMNS = 80;
const DEFAULT_TERMINAL_ROWS = 24;
const LOGIN_CONTENT_SIDE_PADDING = 2;
const MAX_LOGIN_CONTENT_WIDTH = 88;
const MIN_TERMINAL_COLUMNS = 20;
const MIN_TERMINAL_ROWS = 10;

export const LOGIN_TIMEOUT_MESSAGE = 'Timeout getting authorization code!';

function getTextWidth(value = '') {
  return stringWidth(value);
}

function centerOutputLine(outputLine = '', width = 0) {
  const lineWidth = getTextWidth(outputLine);

  if (!outputLine || width <= lineWidth) {
    return outputLine;
  }

  const totalPadding = width - lineWidth;
  const leftPadding = Math.floor(totalPadding / 2);
  const rightPadding = totalPadding - leftPadding;

  return `${' '.repeat(leftPadding)}${outputLine}${' '.repeat(rightPadding)}`;
}

function getWrappedLineBreakIndex(characters = [], width = 0) {
  let consumedWidth = 0;
  let lastWhitespaceIndex = -1;

  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];

    if (/\s/.test(character)) {
      lastWhitespaceIndex = index;
    }

    consumedWidth += getTextWidth(character);

    if (consumedWidth > width) {
      if (lastWhitespaceIndex >= 0) {
        return lastWhitespaceIndex + 1;
      }

      return Math.max(1, index);
    }
  }

  return characters.length;
}

function wrapTextLines(value = '', width = 0) {
  if (width <= 0) {
    return [value];
  }

  const wrappedLines = [];
  const sourceLines = String(value).split('\n');

  for (const sourceLine of sourceLines) {
    if (!sourceLine) {
      wrappedLines.push('');
      continue;
    }

    let remainingCharacters = Array.from(sourceLine);

    while (remainingCharacters.length > 0) {
      const breakIndex = getWrappedLineBreakIndex(remainingCharacters, width);
      const lineCharacters = remainingCharacters.slice(0, breakIndex);
      const nextCharacters = remainingCharacters.slice(breakIndex);
      const nextLine = lineCharacters.join('').trimEnd();

      wrappedLines.push(nextLine);
      remainingCharacters = Array.from(nextCharacters.join('').trimStart());
    }
  }

  return wrappedLines;
}

export function formatCenteredText(value = '', width = 0, wrap = 'wrap') {
  if (wrap === 'wrap') {
    return wrapTextLines(value, width)
      .map((outputLine) => {
        return centerOutputLine(outputLine, width);
      })
      .join('\n');
  }

  return centerOutputLine(value, width);
}

export function getHomeyLoginFooterText({ code, phase }) {
  if (phase === 'opening_browser') {
    return 'Esc cancel • Ctrl+C cancel';
  }

  if (phase === 'waiting_for_code') {
    if (code) {
      return 'Enter submit • Esc clear • Ctrl+C cancel';
    }

    return 'Paste code • Esc cancel • Ctrl+C cancel';
  }

  if (phase === 'verifying') {
    return 'Ctrl+C cancel';
  }

  return '';
}

export function getHomeyLoginLayout({
  terminalColumns = DEFAULT_TERMINAL_COLUMNS,
  terminalRows = DEFAULT_TERMINAL_ROWS,
}) {
  const safeTerminalColumns = Math.max(
    MIN_TERMINAL_COLUMNS,
    terminalColumns || DEFAULT_TERMINAL_COLUMNS,
  );
  const safeTerminalRows = Math.max(MIN_TERMINAL_ROWS, terminalRows || DEFAULT_TERMINAL_ROWS);
  const contentWidth = Math.max(32, Math.min(safeTerminalColumns - 4, MAX_LOGIN_CONTENT_WIDTH));

  return {
    contentInnerWidth: Math.max(8, contentWidth - LOGIN_CONTENT_SIDE_PADDING * 2),
    contentSidePadding: LOGIN_CONTENT_SIDE_PADDING,
    contentWidth,
    terminalRows: safeTerminalRows,
  };
}

export function getHomeyLoginPhaseMessage({ error, phase, profile }) {
  if (phase === 'opening_browser') {
    return 'Opening your browser for Athom account login...';
  }

  if (phase === 'waiting_for_code') {
    return 'Finish login in your browser, or paste the authorization code below.';
  }

  if (phase === 'verifying') {
    return 'Verifying your authorization code...';
  }

  if (phase === 'success') {
    return `You are now logged in as ${profile.firstname} ${profile.lastname}.`;
  }

  if (phase === 'timeout') {
    return 'The authorization code did not arrive in time.';
  }

  return error?.message ?? 'The login flow could not be completed.';
}

export function getHomeyLoginPhaseTitle({ phase, title }) {
  if (phase === 'success') {
    return 'Logged In';
  }

  if (phase === 'timeout') {
    return 'Login Timed Out';
  }

  if (phase === 'error') {
    return 'Login Failed';
  }

  return title;
}
