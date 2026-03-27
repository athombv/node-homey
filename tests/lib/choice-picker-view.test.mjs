import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  formatChoiceCountSummary,
  getChoicePickerFooterText,
} from '../../lib/ui/choice-picker/choice-picker-view.mjs';

describe('choice picker view helpers', () => {
  it('formats count summaries for full and filtered lists', () => {
    assert.strictEqual(formatChoiceCountSummary(1, 1, 'Driver', 'Drivers'), '1 Driver');
    assert.strictEqual(formatChoiceCountSummary(3, 3, 'Driver', 'Drivers'), '3 Drivers');
    assert.strictEqual(
      formatChoiceCountSummary(2, 5, 'Capability', 'Capabilities'),
      '2 of 5 Capabilities',
    );
  });

  it('returns contextual footer text for single select', () => {
    assert.strictEqual(
      getChoicePickerFooterText({
        hasChoices: true,
        mode: 'single',
        query: '',
        submitLabel: 'select',
      }),
      '↑/↓ move • type to filter • Enter select • Esc cancel',
    );
    assert.strictEqual(
      getChoicePickerFooterText({
        hasChoices: true,
        mode: 'single',
        query: 'kitchen',
        submitLabel: 'select',
      }),
      '↑/↓ move • Enter select • Esc clear',
    );
  });

  it('returns contextual footer text for multi select and back navigation', () => {
    assert.strictEqual(
      getChoicePickerFooterText({
        allowBack: true,
        hasChoices: true,
        mode: 'multi',
        query: '',
        submitLabel: 'save',
      }),
      '↑/↓ move • type to filter • Space toggle • Enter save • Esc back',
    );
    assert.strictEqual(
      getChoicePickerFooterText({
        allowBack: true,
        hasChoices: false,
        mode: 'multi',
        query: 'zz',
        submitLabel: 'save',
      }),
      'type to filter • Esc clear',
    );
  });
});
