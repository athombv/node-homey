import { createContext, createElement, useContext, useMemo } from 'react';
import { useStore } from 'zustand';
import { createStore } from 'zustand/vanilla';
import {
  appendQueryInput as appendQueryInputValue,
  filterChoicesByQuery,
  getEffectiveChoiceCursor,
  getInitialChoiceCursor,
  getVisibleChoiceWindowState,
  moveChoiceCursor,
  normalizeChoices,
  removeLastQueryCharacter as removeLastQueryCharacterValue,
} from './choice-picker-state.mjs';

const HomeyChoicePickerStoreContext = createContext(null);

function getDerivedState(state) {
  const filteredChoices = filterChoicesByQuery(state.choices, state.query);
  const effectiveCursor = getEffectiveChoiceCursor(filteredChoices, state.cursor, {
    checkedValues: state.checkedValues,
    selectedValue: state.selectedValue,
  });

  return {
    activeChoice: filteredChoices[effectiveCursor] ?? null,
    effectiveCursor,
    filteredChoices,
  };
}

export function selectHomeyChoicePickerModel(state, maxVisibleRows) {
  const derivedState = getDerivedState(state);
  const windowState = getVisibleChoiceWindowState(
    derivedState.filteredChoices,
    derivedState.effectiveCursor,
    maxVisibleRows,
  );

  return {
    activeChoice: derivedState.activeChoice,
    checkedValues: state.checkedValues,
    hiddenAboveCount: windowState.hiddenAboveCount,
    hiddenBelowCount: windowState.hiddenBelowCount,
    listState: derivedState.filteredChoices.length > 0 ? 'items' : 'empty',
    query: state.query,
    totalCount: state.choices.length,
    visibleChoices: windowState.visibleChoices,
    visibleCount: derivedState.filteredChoices.length,
  };
}

function createModelSelect(maxVisibleRows) {
  let previousResult;
  let previousState;

  return (state) => {
    if (state === previousState) {
      return previousResult;
    }

    previousState = state;
    previousResult = selectHomeyChoicePickerModel(state, maxVisibleRows);
    return previousResult;
  };
}

export function createHomeyChoicePickerStore({
  choices = [],
  defaultValue = null,
  defaultValues = [],
} = {}) {
  const normalizedChoices = normalizeChoices(choices);
  const initialCheckedValues = Array.isArray(defaultValues) ? [...defaultValues] : [];
  const initialSelectedValue =
    defaultValue ??
    normalizedChoices[
      getInitialChoiceCursor({ choices: normalizedChoices, checkedValues: initialCheckedValues })
    ]?.value ??
    null;

  return createStore((set, get) => ({
    appendQueryInput(input, key = {}) {
      const state = get();
      const nextQuery = appendQueryInputValue(state.query, input, key);

      if (nextQuery === state.query) {
        return;
      }

      set({
        cursor: -1,
        query: nextQuery,
      });
    },
    checkedValues: initialCheckedValues,
    choices: normalizedChoices,
    clearQuery() {
      if (!get().query) {
        return;
      }

      set({
        cursor: -1,
        query: '',
      });
    },
    cursor: getInitialChoiceCursor({
      choices: normalizedChoices,
      checkedValues: initialCheckedValues,
      selectedValue: initialSelectedValue,
    }),
    moveCursor(delta = 0) {
      const state = get();
      const filteredChoices = filterChoicesByQuery(state.choices, state.query);
      const nextCursor = moveChoiceCursor(filteredChoices, state.cursor, delta, {
        checkedValues: state.checkedValues,
        selectedValue: state.selectedValue,
      });

      if (nextCursor === state.cursor) {
        return;
      }

      const nextSelectedValue = filteredChoices[nextCursor]?.value ?? state.selectedValue;

      set({
        cursor: nextCursor,
        selectedValue: nextSelectedValue,
      });
    },
    query: '',
    removeLastQueryCharacter() {
      const state = get();

      if (!state.query) {
        return;
      }

      set({
        cursor: -1,
        query: removeLastQueryCharacterValue(state.query),
      });
    },
    selectedValue: initialSelectedValue,
    toggleActiveChoice() {
      const state = get();
      const derivedState = getDerivedState(state);

      if (!derivedState.activeChoice) {
        return;
      }

      set({
        checkedValues: state.checkedValues.includes(derivedState.activeChoice.value)
          ? state.checkedValues.filter((value) => value !== derivedState.activeChoice.value)
          : [...state.checkedValues, derivedState.activeChoice.value],
      });
    },
  }));
}

export function HomeyChoicePickerStoreProvider({ children, store }) {
  return createElement(
    HomeyChoicePickerStoreContext.Provider,
    {
      value: store,
    },
    children,
  );
}

export function useHomeyChoicePickerStore(select) {
  const store = useHomeyChoicePickerStoreApi();
  return useStore(store, select);
}

export function useHomeyChoicePickerModel(maxVisibleRows) {
  const select = useMemo(() => {
    return createModelSelect(maxVisibleRows);
  }, [maxVisibleRows]);

  return useHomeyChoicePickerStore(select);
}

export function useHomeyChoicePickerStoreApi() {
  const store = useContext(HomeyChoicePickerStoreContext);

  if (!store) {
    throw new Error('Homey choice picker store is unavailable.');
  }

  return store;
}
