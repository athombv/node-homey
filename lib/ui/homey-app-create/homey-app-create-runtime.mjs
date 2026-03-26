import { createElement } from 'react';
import { renderInkScreenRuntime } from '../ink-screen-runtime.mjs';
import { HomeyAppCreateScreen } from './HomeyAppCreateScreen.mjs';

export function renderHomeyAppCreateRuntime(
  { questionGroups, title = 'Create a Homey App' },
  inkOptions = {},
) {
  return renderInkScreenRuntime(
    {
      createElement({ finalize }) {
        return createElement(HomeyAppCreateScreen, {
          finalize,
          questionGroups,
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
