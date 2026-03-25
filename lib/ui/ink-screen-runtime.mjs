import { render } from 'ink';

const ENTER_ALTERNATE_SCREEN = '\u001B[?1049h';
const EXIT_ALTERNATE_SCREEN = '\u001B[?1049l';

export function renderInkScreenRuntime(
  { createElement, createSession, loadData, onLoadSuccess = () => {} },
  inkOptions = {},
) {
  return new Promise((resolve, reject) => {
    const runtimeOutput = inkOptions.stdout ?? process.stdout;
    const renderOptions = {
      ...inkOptions,
      exitOnCtrlC: false,
      patchConsole: false,
      stdout: runtimeOutput,
    };
    const useAlternateScreen = Boolean(runtimeOutput.isTTY);
    let alternateScreenActive = false;
    let finalized = false;
    let isActive = true;
    let instance;
    let session;

    function exitAlternateScreen() {
      if (!alternateScreenActive) {
        return;
      }

      runtimeOutput.write(EXIT_ALTERNATE_SCREEN);
      alternateScreenActive = false;
    }

    function handleProcessExit() {
      exitAlternateScreen();
    }

    function finalize(result) {
      if (finalized) {
        return;
      }

      finalized = true;
      isActive = false;

      Promise.resolve().then(() => {
        try {
          instance?.unmount();
        } finally {
          if (useAlternateScreen) {
            process.off('exit', handleProcessExit);
            exitAlternateScreen();
          }
        }

        resolve(result);
      });
    }

    if (useAlternateScreen) {
      runtimeOutput.write(ENTER_ALTERNATE_SCREEN);
      alternateScreenActive = true;
      process.once('exit', handleProcessExit);
    }

    try {
      Promise.resolve(createSession())
        .then((createdSession) => {
          if (finalized) {
            return;
          }

          session = createdSession;
          instance = render(createElement({ finalize, session }), renderOptions);

          if (!loadData) {
            return;
          }

          Promise.resolve(loadData())
            .then((result = {}) => {
              if (!isActive || finalized) {
                return;
              }

              onLoadSuccess(session, result);
            })
            .catch((error) => {
              if (!isActive || finalized) {
                return;
              }

              finalize({
                error,
                status: 'error',
              });
            });
        })
        .catch((error) => {
          if (useAlternateScreen) {
            process.off('exit', handleProcessExit);
            exitAlternateScreen();
          }

          reject(error);
        });
    } catch (error) {
      if (useAlternateScreen) {
        process.off('exit', handleProcessExit);
        exitAlternateScreen();
      }

      reject(error);
    }
  });
}
