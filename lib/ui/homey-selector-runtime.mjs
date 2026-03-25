import React from 'react';
import { HomeySelectorScreen } from './HomeySelectorScreen.mjs';
import { renderInkScreenRuntime } from './ink-screen-runtime.mjs';
import { createHomeySelectorStore } from './homey-selector-store.mjs';

const h = React.createElement;

function createHomeySelectorElement({ onCancel, onSubmit, store, subtitle, title }) {
  return h(HomeySelectorScreen, {
    onCancel,
    onSubmit,
    store,
    subtitle,
    title,
  });
}

export function renderHomeySelectorRuntime(
  { activeHomey = null, homeys = [], loadData, subtitle, title },
  inkOptions = {},
) {
  const isLoading = typeof loadData === 'function';

  return renderInkScreenRuntime(
    {
      createElement({ finalize, session }) {
        return createHomeySelectorElement({
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
          store: createHomeySelectorStore({
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
