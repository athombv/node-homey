function normalizeSearchText(value = '') {
  return String(value ?? '').toLocaleLowerCase();
}

export function normalizeChoice(choice) {
  if (typeof choice === 'string') {
    return {
      label: choice,
      searchText: choice,
      value: choice,
    };
  }

  const label = choice.label ?? choice.name ?? String(choice.value ?? '');
  const rawSearchParts = [
    label,
    choice.value,
    choice.searchText,
    ...(Array.isArray(choice.searchTerms) ? choice.searchTerms : []),
  ].filter(Boolean);

  return {
    ...choice,
    label,
    searchText: rawSearchParts.join(' '),
    value: choice.value,
  };
}

export function normalizeChoices(choices = []) {
  return Array.isArray(choices) ? choices.map(normalizeChoice) : [];
}

export function filterChoicesByQuery(choices = [], query = '') {
  if (!query) {
    return choices;
  }

  const normalizedQuery = normalizeSearchText(query);

  return choices.filter((choice) => {
    return normalizeSearchText(choice.searchText).includes(normalizedQuery);
  });
}

function getMultiSelectInitialCursor(choices = [], checkedValues = []) {
  const checkedValueSet = new Set(Array.isArray(checkedValues) ? checkedValues : []);
  const checkedIndex = choices.findIndex((choice) => checkedValueSet.has(choice.value));

  if (checkedIndex >= 0) {
    return checkedIndex;
  }

  return choices.length > 0 ? 0 : -1;
}

export function getInitialChoiceCursor({
  choices = [],
  checkedValues = [],
  selectedValue = null,
} = {}) {
  if (choices.length === 0) {
    return -1;
  }

  if (selectedValue !== null && typeof selectedValue !== 'undefined') {
    const selectedIndex = choices.findIndex((choice) => choice.value === selectedValue);

    if (selectedIndex >= 0) {
      return selectedIndex;
    }
  }

  return getMultiSelectInitialCursor(choices, checkedValues);
}

export function getEffectiveChoiceCursor(
  choices = [],
  cursor = -1,
  { checkedValues = [], selectedValue = null } = {},
) {
  if (choices.length === 0) {
    return -1;
  }

  if (Number.isInteger(cursor) && cursor >= 0 && cursor < choices.length) {
    return cursor;
  }

  return getInitialChoiceCursor({
    choices,
    checkedValues,
    selectedValue,
  });
}

export function moveChoiceCursor(
  choices = [],
  cursor = -1,
  delta = 0,
  { checkedValues = [], selectedValue = null } = {},
) {
  const effectiveCursor = getEffectiveChoiceCursor(choices, cursor, {
    checkedValues,
    selectedValue,
  });

  if (effectiveCursor === -1) {
    return -1;
  }

  const nextIndex =
    (((effectiveCursor + delta) % choices.length) + choices.length) % choices.length;
  return nextIndex;
}

function getVisibleChoiceSlice(choices = [], cursor = -1, maxVisibleItems = choices.length) {
  if (choices.length === 0) {
    return {
      endIndex: 0,
      startIndex: 0,
      visibleChoices: [],
    };
  }

  const clampedMaxVisibleItems = Math.max(1, maxVisibleItems);

  if (choices.length <= clampedMaxVisibleItems) {
    return {
      endIndex: choices.length,
      startIndex: 0,
      visibleChoices: choices,
    };
  }

  const selectedIndex = Math.max(0, Math.min(cursor, choices.length - 1));
  const startIndex = Math.max(
    0,
    Math.min(
      selectedIndex - Math.floor(clampedMaxVisibleItems / 2),
      choices.length - clampedMaxVisibleItems,
    ),
  );
  const visibleChoices = choices.slice(startIndex, startIndex + clampedMaxVisibleItems);

  return {
    endIndex: startIndex + visibleChoices.length,
    startIndex,
    visibleChoices,
  };
}

export function getVisibleChoiceWindowState(
  choices = [],
  cursor = -1,
  maxVisibleRows = choices.length,
) {
  if (choices.length === 0) {
    return {
      hiddenAboveCount: 0,
      hiddenBelowCount: 0,
      visibleChoices: [],
    };
  }

  const clampedMaxVisibleRows = Math.max(1, maxVisibleRows);

  if (choices.length <= clampedMaxVisibleRows) {
    return {
      hiddenAboveCount: 0,
      hiddenBelowCount: 0,
      visibleChoices: choices,
    };
  }

  for (
    let visibleItemCount = Math.min(choices.length, clampedMaxVisibleRows);
    visibleItemCount >= 1;
    visibleItemCount -= 1
  ) {
    const { endIndex, startIndex, visibleChoices } = getVisibleChoiceSlice(
      choices,
      cursor,
      visibleItemCount,
    );
    const hiddenAboveCount = startIndex;
    const hiddenBelowCount = choices.length - endIndex;
    const requiredRows =
      visibleChoices.length + (hiddenAboveCount > 0 ? 1 : 0) + (hiddenBelowCount > 0 ? 1 : 0);

    if (requiredRows <= clampedMaxVisibleRows) {
      return {
        hiddenAboveCount,
        hiddenBelowCount,
        visibleChoices,
      };
    }
  }

  return {
    hiddenAboveCount: 0,
    hiddenBelowCount: 0,
    visibleChoices: getVisibleChoiceSlice(choices, cursor, 1).visibleChoices,
  };
}

export function appendQueryInput(query = '', input = '', key = {}) {
  const sanitizedInput = String(input ?? '').replace(/[\r\n]+/g, '');
  const shouldIgnoreInput =
    !sanitizedInput ||
    key.ctrl ||
    key.meta ||
    key.tab ||
    key.return ||
    key.escape ||
    key.upArrow ||
    key.downArrow ||
    key.leftArrow ||
    key.rightArrow ||
    key.pageDown ||
    key.pageUp ||
    key.home ||
    key.end;

  if (shouldIgnoreInput) {
    return query;
  }

  return `${query}${sanitizedInput}`;
}

export function removeLastQueryCharacter(query = '') {
  return Array.from(query).slice(0, -1).join('');
}
