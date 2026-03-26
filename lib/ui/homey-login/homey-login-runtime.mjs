import { createElement } from 'react';
import { HomeyLoginScreen } from './HomeyLoginScreen.mjs';
import { renderInkScreenRuntime } from '../ink-screen-runtime.mjs';

export function renderHomeyLoginRuntime(
  { createLoginSession, title = 'Log in to Athom' },
  inkOptions = {},
) {
  return renderInkScreenRuntime(
    {
      createElement({ finalize, session }) {
        return createElement(HomeyLoginScreen, {
          finalize,
          session,
          title,
        });
      },
      createSession() {
        return createLoginSession();
      },
    },
    inkOptions,
  );
}
