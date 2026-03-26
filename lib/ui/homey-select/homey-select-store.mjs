import { createContext, createElement, useContext, useMemo } from 'react';
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
} from './homey-select-state.mjs';

const HomeySelectStoreContext = createContext(null);

function getHomeySelectDerivedState(state) {
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

export function selectHomeySelectHasInteractiveHomeys(state) {
  return getHomeySelectDerivedState(state).interactiveHomeys.length > 0;
}

export function selectHomeySelectInteractiveCount(state) {
  return getHomeySelectDerivedState(state).interactiveHomeys.length;
}

export function selectHomeySelectVisibleCount(state) {
  return getHomeySelectDerivedState(state).visibleHomeys.length;
}

export function selectHomeySelectEffectiveSelectedId(state) {
  return getHomeySelectDerivedState(state).effectiveSelectedId;
}

export function selectHomeySelectSelectedHomey(state) {
  const derivedState = getHomeySelectDerivedState(state);

  return (
    derivedState.visibleHomeys.find((homey) => homey.id === derivedState.effectiveSelectedId) ??
    null
  );
}

export function selectHomeySelectListModel(state, maxVisibleRows) {
  const derivedState = getHomeySelectDerivedState(state);
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

export function selectHomeySelectRowModel(state, rowId) {
  const derivedState = getHomeySelectDerivedState(state);
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

function createListModelSelect(maxVisibleRows) {
  let previousResult;
  let previousState;

  return (state) => {
    if (state === previousState) {
      return previousResult;
    }

    previousState = state;
    previousResult = selectHomeySelectListModel(state, maxVisibleRows);
    return previousResult;
  };
}

function createRowModelSelect(rowId) {
  let previousResult;
  let previousState;

  return (state) => {
    if (state === previousState) {
      return previousResult;
    }

    previousState = state;
    previousResult = selectHomeySelectRowModel(state, rowId);
    return previousResult;
  };
}

export function createHomeySelectStore({
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
      const derivedState = getHomeySelectDerivedState(state);
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

export function HomeySelectStoreProvider({ children, store }) {
  return createElement(
    HomeySelectStoreContext.Provider,
    {
      value: store,
    },
    children,
  );
}

export function useHomeySelectStore(select) {
  const store = useHomeySelectStoreApi();
  return useStore(store, select);
}

export function useHomeySelectListModel(maxVisibleRows) {
  const select = useMemo(() => {
    return createListModelSelect(maxVisibleRows);
  }, [maxVisibleRows]);

  return useHomeySelectStore(select);
}

export function useHomeySelectRowModel(rowId) {
  const select = useMemo(() => {
    return createRowModelSelect(rowId);
  }, [rowId]);

  return useHomeySelectStore(select);
}

export function useHomeySelectStoreApi() {
  const store = useContext(HomeySelectStoreContext);

  if (!store) {
    throw new Error('Homey select store is unavailable.');
  }

  return store;
}
