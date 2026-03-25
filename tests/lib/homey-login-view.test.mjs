import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  formatCenteredText,
  getHomeyLoginFooterText,
  getHomeyLoginLayout,
  getHomeyLoginPhaseMessage,
  getHomeyLoginPhaseTitle,
} from '../../lib/ui/homey-login-view.mjs';

describe('homey login view helpers', () => {
  it('returns contextual footer text for the login phases', () => {
    assert.strictEqual(
      getHomeyLoginFooterText({
        code: '',
        phase: 'opening_browser',
      }),
      'Esc cancel • Ctrl+C cancel',
    );
    assert.strictEqual(
      getHomeyLoginFooterText({
        code: '',
        phase: 'waiting_for_code',
      }),
      'Paste code • Esc cancel • Ctrl+C cancel',
    );
    assert.strictEqual(
      getHomeyLoginFooterText({
        code: 'abc123',
        phase: 'waiting_for_code',
      }),
      'Enter submit • Esc clear • Ctrl+C cancel',
    );
    assert.strictEqual(
      getHomeyLoginFooterText({
        code: '',
        phase: 'verifying',
      }),
      'Ctrl+C cancel',
    );
  });

  it('derives a bounded fullscreen layout', () => {
    assert.deepStrictEqual(
      getHomeyLoginLayout({
        terminalColumns: 100,
        terminalRows: 24,
      }),
      {
        contentInnerWidth: 84,
        contentSidePadding: 2,
        contentWidth: 88,
        terminalRows: 24,
      },
    );
  });

  it('formats centered text for wrapped lines without dropping line breaks', () => {
    assert.strictEqual(formatCenteredText('abcdefghij klmnop', 10), 'abcdefghij\n  klmnop  ');
  });

  it('derives phase copy for titles and messages', () => {
    assert.strictEqual(
      getHomeyLoginPhaseTitle({
        phase: 'success',
        title: 'Log in to Athom',
      }),
      'Logged In',
    );
    assert.strictEqual(
      getHomeyLoginPhaseMessage({
        phase: 'success',
        profile: {
          firstname: 'Alice',
          lastname: 'Example',
        },
      }),
      'You are now logged in as Alice Example.',
    );
  });
});
