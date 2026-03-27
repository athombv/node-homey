import { useInput } from 'ink';
import { useHomeyChoicePickerStoreApi } from './choice-picker-store.mjs';

export function useHomeyChoicePickerInput({
  allowBack = false,
  mode = 'single',
  onBack,
  onCancel,
  onSubmit,
  searchEnabled = true,
}) {
  const store = useHomeyChoicePickerStoreApi();

  useInput((input, key) => {
    const state = store.getState();

    if (key.ctrl && input === 'c') {
      onCancel();
      return;
    }

    if (key.escape) {
      if (state.query) {
        state.clearQuery();
        return;
      }

      if (allowBack && typeof onBack === 'function') {
        onBack();
        return;
      }

      onCancel();
      return;
    }

    if (searchEnabled && (key.backspace || key.delete)) {
      state.removeLastQueryCharacter();
      return;
    }

    if (key.upArrow) {
      state.moveCursor(-1);
      return;
    }

    if (key.downArrow) {
      state.moveCursor(1);
      return;
    }

    if (mode === 'multi' && input === ' ') {
      state.toggleActiveChoice();
      return;
    }

    if (key.return) {
      const nextState = store.getState();
      const activeChoice =
        nextState.choices.filter((choice) => {
          if (!nextState.query) {
            return true;
          }

          return choice.searchText
            .toLocaleLowerCase()
            .includes(nextState.query.toLocaleLowerCase());
        })[nextState.cursor >= 0 ? nextState.cursor : 0] ?? null;

      if (mode === 'multi') {
        onSubmit({
          checkedValues: nextState.checkedValues,
        });
        return;
      }

      if (activeChoice) {
        onSubmit({
          activeChoice,
        });
      }

      return;
    }

    if (searchEnabled) {
      state.appendQueryInput(input, key);
    }
  });
}
