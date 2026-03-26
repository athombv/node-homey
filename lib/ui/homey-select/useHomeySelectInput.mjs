import { useInput } from 'ink';
import { selectHomeySelectSelectedHomey, useHomeySelectStoreApi } from './homey-select-store.mjs';

export function useHomeySelectInput({ onCancel, onSubmit }) {
  const store = useHomeySelectStoreApi();

  useInput((input, key) => {
    const state = store.getState();

    if (key.ctrl && input === 'c') {
      onCancel();
      return;
    }

    if (state.isLoading) {
      return;
    }

    if (key.escape) {
      if (state.query) {
        state.clearQuery();
        return;
      }

      onCancel();
      return;
    }

    if (key.backspace || key.delete) {
      state.removeLastQueryCharacter();
      return;
    }

    if (key.upArrow) {
      state.moveSelection(-1);
      return;
    }

    if (key.downArrow) {
      state.moveSelection(1);
      return;
    }

    if (key.return) {
      const selectedHomey = selectHomeySelectSelectedHomey(store.getState());

      if (selectedHomey) {
        onSubmit(selectedHomey);
      }

      return;
    }

    state.appendQueryInput(input, key);
  });
}
