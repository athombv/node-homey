import { createElement } from 'react';
import { renderInkScreenRuntime } from '../ink-screen-runtime.mjs';
import { HomeyChoicePickerScreen } from './HomeyChoicePickerScreen.mjs';
import {
  createHomeyChoicePickerStore,
  HomeyChoicePickerStoreProvider,
} from './choice-picker-store.mjs';

function createHomeyChoicePickerElement({
  allowBack,
  itemLabelPlural,
  itemLabelSingular,
  mode,
  onBack,
  onCancel,
  onSubmit,
  searchEnabled,
  store,
  submitLabel,
  subtitle,
  title,
}) {
  return createElement(
    HomeyChoicePickerStoreProvider,
    {
      store,
    },
    createElement(HomeyChoicePickerScreen, {
      allowBack,
      itemLabelPlural,
      itemLabelSingular,
      mode,
      onBack,
      onCancel,
      onSubmit,
      searchEnabled,
      submitLabel,
      subtitle,
      title,
    }),
  );
}

export function renderHomeyChoicePickerRuntime(
  {
    allowBack = false,
    choices = [],
    defaultValue = null,
    defaultValues = [],
    itemLabelPlural = 'Items',
    itemLabelSingular = 'Item',
    mode = 'single',
    searchEnabled = true,
    submitLabel = 'select',
    subtitle,
    title,
  },
  inkOptions = {},
) {
  return renderInkScreenRuntime(
    {
      createElement({ finalize, session }) {
        return createHomeyChoicePickerElement({
          allowBack,
          itemLabelPlural,
          itemLabelSingular,
          mode,
          onBack: () => {
            finalize({ status: 'back' });
          },
          onCancel: () => {
            finalize({ status: 'cancelled' });
          },
          onSubmit: ({ activeChoice, checkedValues }) => {
            if (mode === 'multi') {
              const valueSet = new Set(checkedValues);
              finalize({
                choices: session.store
                  .getState()
                  .choices.filter((choice) => valueSet.has(choice.value)),
                status: 'submitted',
                values: checkedValues,
              });
              return;
            }

            finalize({
              choice: activeChoice,
              status: 'submitted',
              value: activeChoice.value,
            });
          },
          searchEnabled,
          store: session.store,
          submitLabel,
          subtitle,
          title,
        });
      },
      createSession() {
        return {
          store: createHomeyChoicePickerStore({
            choices,
            defaultValue,
            defaultValues,
          }),
        };
      },
    },
    inkOptions,
  );
}
