import { createElement, useEffect, useEffectEvent, useRef, useState } from 'react';
import { Box, useInput, useStdout } from 'ink';
import { HomeyLoginContent } from './HomeyLoginContent.mjs';
import { HomeyLoginFooter } from './HomeyLoginFooter.mjs';
import {
  getHomeyLoginFooterText,
  getHomeyLoginLayout,
  LOGIN_TIMEOUT_MESSAGE,
} from './homey-login-view.mjs';

const SUCCESS_DELAY_MS = 700;
const FAILURE_DELAY_MS = 900;

function sleep(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

export function HomeyLoginScreen({ finalize, session, title }) {
  const { stdout } = useStdout();
  const [code, setCode] = useState('');
  const [error, setError] = useState(null);
  const [phase, setPhase] = useState('opening_browser');
  const [profile, setProfile] = useState(null);
  const codeRef = useRef('');
  const didFinishRef = useRef(false);
  const layout = getHomeyLoginLayout({
    terminalColumns: stdout.columns,
    terminalRows: stdout.rows,
  });
  const footerText = getHomeyLoginFooterText({
    code,
    phase,
  });

  const handleCodeChange = useEffectEvent((nextCode) => {
    codeRef.current = nextCode;
    setCode(nextCode);
  });

  const finish = useEffectEvent(async (result, delayMs = 0) => {
    if (didFinishRef.current) {
      return;
    }

    didFinishRef.current = true;
    session.close();

    if (delayMs > 0) {
      await sleep(delayMs);
    }

    finalize(result);
  });

  const handleError = useEffectEvent(async (nextError) => {
    setError(nextError);
    setPhase(nextError?.message === LOGIN_TIMEOUT_MESSAGE ? 'timeout' : 'error');
    await finish(
      {
        error: nextError,
        status: 'error',
      },
      FAILURE_DELAY_MS,
    );
  });

  const submitAuthorizationCode = useEffectEvent(async (nextCode) => {
    if (didFinishRef.current) {
      return;
    }

    const normalizedCode = nextCode.trim();
    if (!normalizedCode) {
      return;
    }

    setPhase('verifying');

    try {
      const nextProfile = await session.authenticateWithCode(normalizedCode);

      setProfile(nextProfile);
      setPhase('success');

      await finish(
        {
          profile: nextProfile,
          status: 'authenticated',
        },
        SUCCESS_DELAY_MS,
      );
    } catch (nextError) {
      await handleError(nextError);
    }
  });

  useEffect(() => {
    let active = true;

    Promise.resolve(session.openBrowser()).finally(() => {
      if (!active || didFinishRef.current) {
        return;
      }

      setPhase((currentPhase) => {
        return currentPhase === 'opening_browser' ? 'waiting_for_code' : currentPhase;
      });
    });

    session
      .waitForAuthorizationCode()
      .then((nextCode) => {
        if (!active || didFinishRef.current) {
          return;
        }

        submitAuthorizationCode(nextCode);
      })
      .catch((nextError) => {
        if (!active || didFinishRef.current) {
          return;
        }

        handleError(nextError);
      });

    return () => {
      active = false;
      session.close();
    };
  }, [session]);

  useInput((input, key) => {
    if (didFinishRef.current) {
      return;
    }

    const isEscapeInput = key.escape || input === '\u001B';

    if (key.ctrl && input === 'c') {
      finish({
        status: 'cancelled',
      });
      return;
    }

    if (phase !== 'waiting_for_code') {
      return;
    }

    if (isEscapeInput) {
      if (codeRef.current) {
        handleCodeChange('');
        return;
      }

      finish({
        status: 'cancelled',
      });
      return;
    }
  });

  return createElement(
    Box,
    {
      flexDirection: 'column',
      height: layout.terminalRows,
      overflow: 'hidden',
      width: '100%',
    },
    createElement(
      Box,
      {
        alignItems: 'center',
        flexDirection: 'column',
        flexGrow: 1,
        justifyContent: 'center',
        paddingX: 2,
        width: '100%',
      },
      createElement(HomeyLoginContent, {
        code,
        contentInnerWidth: layout.contentInnerWidth,
        contentSidePadding: layout.contentSidePadding,
        contentWidth: layout.contentWidth,
        error,
        inputFocus: phase === 'waiting_for_code',
        onCodeChange: handleCodeChange,
        onCodeSubmit() {
          void submitAuthorizationCode(codeRef.current);
        },
        phase,
        profile,
        title,
        url: session.url,
      }),
    ),
    createElement(
      Box,
      {
        justifyContent: 'center',
        paddingX: 2,
        width: '100%',
      },
      createElement(HomeyLoginFooter, {
        text: footerText,
        width: layout.contentInnerWidth,
      }),
    ),
  );
}
