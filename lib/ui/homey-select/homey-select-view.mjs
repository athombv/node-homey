import stringWidth from 'string-width';

const FOOTER_SEPARATOR = ' • ';
const LIST_HORIZONTAL_PADDING = 1;
const ROW_HORIZONTAL_PADDING = 2;
const ROW_NAME_GAP = 1;
const BADGE_GAP = 1;
const MINIMUM_NAME_WIDTH = 12;
export const SELECTOR_ROW_HEIGHT = 1;
const MIN_TERMINAL_COLUMNS = 20;
const MIN_TERMINAL_ROWS = 10;
const HEADER_ROWS_WITH_SUBTITLE = 3;
const HEADER_ROWS_WITHOUT_SUBTITLE = 2;
const LIST_GAP_ROWS = 1;
const FOOTER_ROWS = 1;

function getTextWidth(value = '') {
  return stringWidth(value);
}

function getBadgeWidth(label) {
  return getTextWidth(`[${label}]`);
}

export function formatHomeyCountSummary(visibleCount, totalCount) {
  const totalLabel = totalCount === 1 ? 'Homey' : 'Homeys';

  if (visibleCount === totalCount) {
    return `${totalCount} ${totalLabel}`;
  }

  return `${visibleCount} of ${totalCount} ${totalLabel}`;
}

export function formatOverflowMarkerLabel(direction, count) {
  return `${count} more ${direction}`;
}

export function getSelectFooterText({
  hasInteractiveHomeys,
  isLoading = false,
  query = '',
  visibleCount = 0,
}) {
  if (isLoading) {
    return 'Esc cancel';
  }

  if (!hasInteractiveHomeys) {
    return 'Esc cancel';
  }

  if (visibleCount === 0 && query) {
    return ['type to filter', 'Esc clear'].join(FOOTER_SEPARATOR);
  }

  if (query) {
    return ['↑/↓ move', 'Enter select', 'Esc clear'].join(FOOTER_SEPARATOR);
  }

  return ['↑/↓ move', 'type to filter', 'Enter select', 'Esc cancel'].join(FOOTER_SEPARATOR);
}

export function getHomeyRowContentWidth(terminalColumns = 80) {
  return Math.max(1, terminalColumns - LIST_HORIZONTAL_PADDING * 2 - ROW_HORIZONTAL_PADDING * 2);
}

export function getHomeySelectLayout({
  hasSubtitle = false,
  terminalColumns = 80,
  terminalRows = 24,
}) {
  const safeTerminalRows = Math.max(MIN_TERMINAL_ROWS, terminalRows || 24);
  const safeTerminalColumns = Math.max(MIN_TERMINAL_COLUMNS, terminalColumns || 80);
  const headerRows = hasSubtitle ? HEADER_ROWS_WITH_SUBTITLE : HEADER_ROWS_WITHOUT_SUBTITLE;
  const bodyRows = Math.max(
    SELECTOR_ROW_HEIGHT,
    safeTerminalRows - headerRows - LIST_GAP_ROWS - FOOTER_ROWS,
  );

  return {
    listGapRows: LIST_GAP_ROWS,
    maxVisibleRows: Math.max(1, Math.floor(bodyRows / SELECTOR_ROW_HEIGHT)),
    rowContentWidth: getHomeyRowContentWidth(safeTerminalColumns),
    terminalRows: safeTerminalRows,
  };
}

export function getResponsiveBadgeVisibility({
  availableWidth,
  isCurrent,
  minimumNameWidth = MINIMUM_NAME_WIDTH,
  platform,
}) {
  const currentBadgeWidth = isCurrent ? getBadgeWidth('current') : 0;
  const platformBadgeWidth = platform ? getBadgeWidth(platform) : 0;

  function canFitBadges(badgesWidth) {
    const remainingWidth = availableWidth - badgesWidth - ROW_NAME_GAP;
    return remainingWidth >= minimumNameWidth;
  }

  if (isCurrent && platform) {
    const combinedBadgeWidth = currentBadgeWidth + BADGE_GAP + platformBadgeWidth;

    if (canFitBadges(combinedBadgeWidth)) {
      return {
        showCurrent: true,
        showPlatform: true,
      };
    }

    if (canFitBadges(currentBadgeWidth)) {
      return {
        showCurrent: true,
        showPlatform: false,
      };
    }

    return {
      showCurrent: false,
      showPlatform: false,
    };
  }

  if (isCurrent) {
    return {
      showCurrent: canFitBadges(currentBadgeWidth),
      showPlatform: false,
    };
  }

  if (platform) {
    return {
      showCurrent: false,
      showPlatform: canFitBadges(platformBadgeWidth),
    };
  }

  return {
    showCurrent: false,
    showPlatform: false,
  };
}
