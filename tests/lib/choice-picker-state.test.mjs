import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  appendQueryInput,
  filterChoicesByQuery,
  getEffectiveChoiceCursor,
  getVisibleChoiceWindowState,
  moveChoiceCursor,
  normalizeChoices,
  removeLastQueryCharacter,
} from '../../lib/ui/choice-picker/choice-picker-state.mjs';

describe('choice picker state helpers', () => {
  it('matches queries against both labels and extra search terms', () => {
    const choices = normalizeChoices([
      {
        label: 'On/Off [onoff]',
        searchTerms: ['On/Off', 'onoff'],
        value: 'onoff',
      },
      {
        label: 'Dim [dim]',
        searchTerms: ['Dim', 'dim'],
        value: 'dim',
      },
    ]);

    assert.deepStrictEqual(
      filterChoicesByQuery(choices, 'ono').map((choice) => choice.value),
      ['onoff'],
    );
    assert.deepStrictEqual(
      filterChoicesByQuery(choices, 'dim').map((choice) => choice.value),
      ['dim'],
    );
  });

  it('falls back to the first checked value when the cursor is not valid', () => {
    const choices = normalizeChoices([
      { label: 'One', value: 'one' },
      { label: 'Two', value: 'two' },
      { label: 'Three', value: 'three' },
    ]);

    assert.strictEqual(
      getEffectiveChoiceCursor(choices, -1, {
        checkedValues: ['two'],
      }),
      1,
    );
  });

  it('wraps cursor movement across the filtered set', () => {
    const choices = normalizeChoices([
      { label: 'One', value: 'one' },
      { label: 'Two', value: 'two' },
    ]);

    assert.strictEqual(moveChoiceCursor(choices, 0, -1), 1);
    assert.strictEqual(moveChoiceCursor(choices, 1, 1), 0);
  });

  it('returns a centered visible window with overflow counts', () => {
    const choices = normalizeChoices([
      { label: 'One', value: 'one' },
      { label: 'Two', value: 'two' },
      { label: 'Three', value: 'three' },
      { label: 'Four', value: 'four' },
      { label: 'Five', value: 'five' },
    ]);

    assert.deepStrictEqual(getVisibleChoiceWindowState(choices, 2, 3), {
      hiddenAboveCount: 2,
      hiddenBelowCount: 2,
      visibleChoices: choices.slice(2, 3),
    });
  });

  it('appends and removes query input while ignoring control keys', () => {
    assert.strictEqual(appendQueryInput('', 'a', {}), 'a');
    assert.strictEqual(appendQueryInput('a', 'b', { ctrl: true }), 'a');
    assert.strictEqual(removeLastQueryCharacter('ab'), 'a');
  });
});
