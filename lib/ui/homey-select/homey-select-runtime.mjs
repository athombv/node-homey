import { createElement } from 'react';
import { HomeySelectScreen } from './HomeySelectScreen.mjs';
import { renderInkScreenRuntime } from '../ink-screen-runtime.mjs';
import { createHomeySelectStore } from './homey-select-store.mjs';

function createHomeySelectElement({ onCancel, onSubmit, store, subtitle, title }) {
  return createElement(HomeySelectScreen, {
    onCancel,
    onSubmit,
    store,
    subtitle,
    title,
  });
}

export function renderHomeySelectRuntime(
  { activeHomey = null, homeys = [], loadData, subtitle, title },
  inkOptions = {},
) {
  const isLoading = typeof loadData === 'function';

  return renderInkScreenRuntime(
    {
      createElement({ finalize, session }) {
        return createHomeySelectElement({
          finalize,
          onCancel: () => {
            finalize({ status: 'cancelled' });
          },
          onSubmit: (selectedHomey) => {
            finalize({ homey: selectedHomey, status: 'selected' });
          },
          store: session.store,
          subtitle,
          title,
        });
      },
      createSession() {
        return {
          store: createHomeySelectStore({
            activeHomey: isLoading ? null : activeHomey,
            homeys: isLoading ? [] : homeys,
            isLoading,
          }),
        };
      },
      loadData,
      onLoadSuccess(session, result = {}) {
        session.store.getState().setLoadedData({
          activeHomey: result.activeHomey ?? null,
          homeys: result.homeys ?? [],
        });
      },
    },
    inkOptions,
  );
}
