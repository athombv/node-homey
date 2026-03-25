import React, { useContext, useMemo } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import {
  appendQueryInput as appendQueryInputValue,
  filterHomeysByQuery,
  getEffectiveSelectedHomeyId,
  getInitialSelectedHomeyId,
  getInteractiveHomeys,
  getVisibleHomeyWindowState,
  moveSelectedHomeyId,
  removeLastQueryCharacter as removeLastQueryCharacterValue,
} from './homey-selector-state.mjs';

const HomeySelectorStoreContext = React.createContext(null);

function getHomeySelectorDerivedState(state) {
  const interactiveHomeys = getInteractiveHomeys(state.homeys);
  const visibleHomeys = filterHomeysByQuery(interactiveHomeys, state.query);
  const effectiveSelectedId = getEffectiveSelectedHomeyId(
    visibleHomeys,
    state.selectedId,
    state.activeHomey,
  );

  return {
    effectiveSelectedId,
    interactiveHomeys,
    visibleHomeys,
  };
}

export function selectHomeySelectorHasInteractiveHomeys(state) {
  return getHomeySelectorDerivedState(state).interactiveHomeys.length > 0;
}

export function selectHomeySelectorInteractiveCount(state) {
  return getHomeySelectorDerivedState(state).interactiveHomeys.length;
}

export function selectHomeySelectorVisibleCount(state) {
  return getHomeySelectorDerivedState(state).visibleHomeys.length;
}

export function selectHomeySelectorEffectiveSelectedId(state) {
  return getHomeySelectorDerivedState(state).effectiveSelectedId;
}

export function selectHomeySelectorSelectedHomey(state) {
  const derivedState = getHomeySelectorDerivedState(state);

  return (
    derivedState.visibleHomeys.find((homey) => homey.id === derivedState.effectiveSelectedId) ??
    null
  );
}

export function selectHomeySelectorListModel(state, maxVisibleRows) {
  const derivedState = getHomeySelectorDerivedState(state);
  const windowState = getVisibleHomeyWindowState(
    derivedState.visibleHomeys,
    derivedState.effectiveSelectedId,
    maxVisibleRows,
  );

  return {
    hasInteractiveHomeys: derivedState.interactiveHomeys.length > 0,
    hiddenAboveCount: windowState.hiddenAboveCount,
    hiddenBelowCount: windowState.hiddenBelowCount,
    listState: state.isLoading
      ? 'loading'
      : derivedState.visibleHomeys.length > 0
        ? 'items'
        : 'empty',
    query: state.query,
    rowIds: windowState.visibleHomeys.map((homey) => homey.id),
  };
}

export function selectHomeySelectorRowModel(state, rowId) {
  const derivedState = getHomeySelectorDerivedState(state);
  const homey = derivedState.interactiveHomeys.find(
    (interactiveHomey) => interactiveHomey.id === rowId,
  );

  if (!homey) {
    return null;
  }

  return {
    homey,
    isCurrent: state.activeHomey?.id === rowId,
    isSelected: derivedState.effectiveSelectedId === rowId,
  };
}

function createListModelSelector(maxVisibleRows) {
  let previousResult;
  let previousState;

  return (state) => {
    if (state === previousState) {
      return previousResult;
    }

    previousState = state;
    previousResult = selectHomeySelectorListModel(state, maxVisibleRows);
    return previousResult;
  };
}

function createRowModelSelector(rowId) {
  let previousResult;
  let previousState;

  return (state) => {
    if (state === previousState) {
      return previousResult;
    }

    previousState = state;
    previousResult = selectHomeySelectorRowModel(state, rowId);
    return previousResult;
  };
}

export function createHomeySelectorStore({
  activeHomey = null,
  homeys = [],
  isLoading = false,
} = {}) {
  return createStore((set, get) => ({
    activeHomey,
    appendQueryInput(input, key = {}) {
      const state = get();
      const nextQuery = appendQueryInputValue(state.query, input, key);

      if (nextQuery === state.query) {
        return;
      }

      set({
        query: nextQuery,
      });
    },
    clearQuery() {
      if (!get().query) {
        return;
      }

      set({
        query: '',
      });
    },
    homeys,
    isLoading,
    moveSelection(delta = 0) {
      const state = get();
      const derivedState = getHomeySelectorDerivedState(state);
      const nextSelectedId = moveSelectedHomeyId(
        derivedState.visibleHomeys,
        derivedState.effectiveSelectedId,
        delta,
        state.activeHomey,
      );

      if (nextSelectedId === state.selectedId) {
        return;
      }

      set({
        selectedId: nextSelectedId,
      });
    },
    query: '',
    removeLastQueryCharacter() {
      const state = get();

      if (!state.query) {
        return;
      }

      set({
        query: removeLastQueryCharacterValue(state.query),
      });
    },
    selectedId: getInitialSelectedHomeyId(getInteractiveHomeys(homeys), activeHomey),
    setLoadedData({ activeHomey: nextActiveHomey = null, homeys: nextHomeys = [] } = {}) {
      set({
        activeHomey: nextActiveHomey,
        homeys: nextHomeys,
        isLoading: false,
      });
    },
  }));
}

export function HomeySelectorStoreProvider({ children, store }) {
  return React.createElement(
    HomeySelectorStoreContext.Provider,
    {
      value: store,
    },
    children,
  );
}

export function useHomeySelectorStore(selector) {
  const store = useHomeySelectorStoreApi();
  return useStore(store, selector);
}

export function useHomeySelectorListModel(maxVisibleRows) {
  const selector = useMemo(() => {
    return createListModelSelector(maxVisibleRows);
  }, [maxVisibleRows]);

  return useHomeySelectorStore(selector);
}

export function useHomeySelectorRowModel(rowId) {
  const selector = useMemo(() => {
    return createRowModelSelector(rowId);
  }, [rowId]);

  return useHomeySelectorStore(selector);
}

export function useHomeySelectorStoreApi() {
  const store = useContext(HomeySelectorStoreContext);

  if (!store) {
    throw new Error('Homey selector store is unavailable.');
  }

  return store;
}
