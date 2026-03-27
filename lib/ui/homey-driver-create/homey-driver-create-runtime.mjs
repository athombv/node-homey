import { createElement } from 'react';
import { renderInkScreenRuntime } from '../ink-screen-runtime.mjs';
import { HomeyDriverCreateScreen } from './HomeyDriverCreateScreen.mjs';

export function renderHomeyDriverCreateRuntime(
  { questionDefinitions, title = 'Create a Driver' },
  inkOptions = {},
) {
  return renderInkScreenRuntime(
    {
      createElement({ finalize }) {
        return createElement(HomeyDriverCreateScreen, {
          finalize,
          questionDefinitions,
          title,
        });
      },
      createSession() {
        return {};
      },
    },
    inkOptions,
  );
}
