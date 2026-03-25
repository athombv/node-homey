export function isHomeyOnline(homey = {}) {
  return !homey.state || homey.state.indexOf('online') === 0;
}

export function getInteractiveHomeys(homeys = []) {
  return homeys.filter((homey) => {
    return isHomeyOnline(homey);
  });
}

export function filterHomeysByQuery(homeys = [], query = '') {
  if (!query) {
    return homeys;
  }

  const normalizedQuery = query.toLocaleLowerCase();

  return homeys.filter((homey) => {
    const searchableFields = [homey.name ?? '', homey.id ?? ''];
    return searchableFields.some((value) => {
      return value.toLocaleLowerCase().includes(normalizedQuery);
    });
  });
}

export function getInitialSelectedHomeyId(homeys = [], activeHomey = null) {
  if (
    activeHomey?.id &&
    homeys.some((homey) => {
      return homey.id === activeHomey.id;
    })
  ) {
    return activeHomey.id;
  }

  return homeys[0]?.id ?? null;
}

export function getEffectiveSelectedHomeyId(homeys = [], selectedId, activeHomey = null) {
  if (
    selectedId &&
    homeys.some((homey) => {
      return homey.id === selectedId;
    })
  ) {
    return selectedId;
  }

  return getInitialSelectedHomeyId(homeys, activeHomey);
}

export function moveSelectedHomeyId(homeys = [], selectedId, delta = 0, activeHomey = null) {
  const effectiveSelectedId = getEffectiveSelectedHomeyId(homeys, selectedId, activeHomey);

  if (effectiveSelectedId === null) {
    return null;
  }

  const selectedIndex = homeys.findIndex((homey) => {
    return homey.id === effectiveSelectedId;
  });

  if (selectedIndex === -1) {
    return effectiveSelectedId;
  }

  const nextIndex = (((selectedIndex + delta) % homeys.length) + homeys.length) % homeys.length;
  return homeys[nextIndex]?.id ?? effectiveSelectedId;
}

function getVisibleHomeySlice(homeys = [], selectedId, maxVisibleItems = homeys.length) {
  if (homeys.length === 0) {
    return {
      endIndex: 0,
      startIndex: 0,
      visibleHomeys: [],
    };
  }

  const clampedMaxVisibleItems = Math.max(1, maxVisibleItems);

  if (homeys.length <= clampedMaxVisibleItems) {
    return {
      endIndex: homeys.length,
      startIndex: 0,
      visibleHomeys: homeys,
    };
  }

  const selectedIndex = Math.max(
    0,
    homeys.findIndex((homey) => {
      return homey.id === selectedId;
    }),
  );
  const startIndex = Math.max(
    0,
    Math.min(
      selectedIndex - Math.floor(clampedMaxVisibleItems / 2),
      homeys.length - clampedMaxVisibleItems,
    ),
  );

  const visibleHomeys = homeys.slice(startIndex, startIndex + clampedMaxVisibleItems);

  return {
    endIndex: startIndex + visibleHomeys.length,
    startIndex,
    visibleHomeys,
  };
}

export function getVisibleHomeyWindowState(
  homeys = [],
  selectedId,
  maxVisibleRows = homeys.length,
) {
  if (homeys.length === 0) {
    return {
      hiddenAboveCount: 0,
      hiddenBelowCount: 0,
      visibleHomeys: [],
    };
  }

  const clampedMaxVisibleRows = Math.max(1, maxVisibleRows);

  if (homeys.length <= clampedMaxVisibleRows) {
    return {
      hiddenAboveCount: 0,
      hiddenBelowCount: 0,
      visibleHomeys: homeys,
    };
  }

  for (
    let visibleItemCount = Math.min(homeys.length, clampedMaxVisibleRows);
    visibleItemCount >= 1;
    visibleItemCount -= 1
  ) {
    const { endIndex, startIndex, visibleHomeys } = getVisibleHomeySlice(
      homeys,
      selectedId,
      visibleItemCount,
    );
    const hiddenAboveCount = startIndex;
    const hiddenBelowCount = homeys.length - endIndex;
    const requiredRows =
      visibleHomeys.length + (hiddenAboveCount > 0 ? 1 : 0) + (hiddenBelowCount > 0 ? 1 : 0);

    if (requiredRows <= clampedMaxVisibleRows) {
      return {
        hiddenAboveCount,
        hiddenBelowCount,
        visibleHomeys,
      };
    }
  }

  return {
    hiddenAboveCount: 0,
    hiddenBelowCount: 0,
    visibleHomeys: getVisibleHomeySlice(homeys, selectedId, 1).visibleHomeys,
  };
}

export function getVisibleHomeyWindow(homeys = [], selectedId, maxVisibleItems = homeys.length) {
  return getVisibleHomeyWindowState(homeys, selectedId, maxVisibleItems).visibleHomeys;
}

export function appendQueryInput(query = '', input = '', key = {}) {
  const sanitizedInput = input.replace(/[\r\n]+/g, '');
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
