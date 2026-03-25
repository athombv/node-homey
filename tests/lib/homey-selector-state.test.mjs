import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  appendQueryInput,
  filterHomeysByQuery,
  getEffectiveSelectedHomeyId,
  getInitialSelectedHomeyId,
  getInteractiveHomeys,
  getVisibleHomeyWindow,
  getVisibleHomeyWindowState,
  moveSelectedHomeyId,
  removeLastQueryCharacter,
} from '../../lib/ui/homey-selector-state.mjs';

const sampleHomeys = [
  {
    id: 'homey-office',
    name: 'Office',
    state: 'online',
  },
  {
    id: 'homey-garage',
    name: 'Garage',
    state: 'offline',
  },
  {
    id: 'homey-attic',
    name: 'Attic',
  },
];

describe('homey selector state', () => {
  it('keeps online and state-less homeys for interactive selection', () => {
    assert.deepStrictEqual(
      getInteractiveHomeys(sampleHomeys).map((homey) => homey.id),
      ['homey-office', 'homey-attic'],
    );
  });

  it('filters by name and id case-insensitively', () => {
    const visibleHomeys = filterHomeysByQuery(getInteractiveHomeys(sampleHomeys), 'OFF');
    assert.deepStrictEqual(
      visibleHomeys.map((homey) => homey.id),
      ['homey-office'],
    );

    const idMatches = filterHomeysByQuery(getInteractiveHomeys(sampleHomeys), 'attic');
    assert.deepStrictEqual(
      idMatches.map((homey) => homey.id),
      ['homey-attic'],
    );
  });

  it('prefers the active Homey for the initial selection', () => {
    const interactiveHomeys = getInteractiveHomeys(sampleHomeys);

    assert.strictEqual(
      getInitialSelectedHomeyId(interactiveHomeys, {
        id: 'homey-attic',
      }),
      'homey-attic',
    );
  });

  it('falls back to the first visible Homey when the selected one is filtered out', () => {
    const visibleHomeys = filterHomeysByQuery(getInteractiveHomeys(sampleHomeys), 'office');

    assert.strictEqual(
      getEffectiveSelectedHomeyId(visibleHomeys, 'homey-attic', null),
      'homey-office',
    );
  });

  it('wraps the selection at the top and bottom of the list', () => {
    const interactiveHomeys = getInteractiveHomeys(sampleHomeys);

    assert.strictEqual(
      moveSelectedHomeyId(interactiveHomeys, 'homey-office', -1, null),
      'homey-attic',
    );
    assert.strictEqual(
      moveSelectedHomeyId(interactiveHomeys, 'homey-office', 1, null),
      'homey-attic',
    );
    assert.strictEqual(
      moveSelectedHomeyId(interactiveHomeys, 'homey-attic', 1, null),
      'homey-office',
    );
  });

  it('returns all Homeys without overflow metadata when the window fits', () => {
    const homeys = [{ id: 'homey-1' }, { id: 'homey-2' }, { id: 'homey-3' }];

    assert.deepStrictEqual(getVisibleHomeyWindowState(homeys, 'homey-2', 4), {
      hiddenAboveCount: 0,
      hiddenBelowCount: 0,
      visibleHomeys: homeys,
    });
  });

  it('returns window metadata with only hidden items below', () => {
    const homeys = [
      { id: 'homey-1' },
      { id: 'homey-2' },
      { id: 'homey-3' },
      { id: 'homey-4' },
      { id: 'homey-5' },
    ];

    assert.deepStrictEqual(getVisibleHomeyWindowState(homeys, 'homey-1', 4), {
      hiddenAboveCount: 0,
      hiddenBelowCount: 2,
      visibleHomeys: homeys.slice(0, 3),
    });
  });

  it('returns window metadata with only hidden items above', () => {
    const homeys = [
      { id: 'homey-1' },
      { id: 'homey-2' },
      { id: 'homey-3' },
      { id: 'homey-4' },
      { id: 'homey-5' },
    ];

    assert.deepStrictEqual(getVisibleHomeyWindowState(homeys, 'homey-5', 4), {
      hiddenAboveCount: 2,
      hiddenBelowCount: 0,
      visibleHomeys: homeys.slice(2, 5),
    });
  });

  it('returns window metadata with hidden items above and below', () => {
    const homeys = [
      { id: 'homey-1' },
      { id: 'homey-2' },
      { id: 'homey-3' },
      { id: 'homey-4' },
      { id: 'homey-5' },
      { id: 'homey-6' },
      { id: 'homey-7' },
    ];

    assert.deepStrictEqual(getVisibleHomeyWindowState(homeys, 'homey-4', 5), {
      hiddenAboveCount: 2,
      hiddenBelowCount: 2,
      visibleHomeys: homeys.slice(2, 5),
    });
  });

  it('keeps the legacy visible window helper aligned with the structured state', () => {
    const homeys = [
      { id: 'homey-1' },
      { id: 'homey-2' },
      { id: 'homey-3' },
      { id: 'homey-4' },
      { id: 'homey-5' },
      { id: 'homey-6' },
      { id: 'homey-7' },
    ];

    assert.deepStrictEqual(
      getVisibleHomeyWindow(homeys, 'homey-4', 5).map((homey) => homey.id),
      ['homey-3', 'homey-4', 'homey-5'],
    );
  });

  it('appends printable input and ignores navigation keys', () => {
    assert.strictEqual(appendQueryInput('ho', 'm', {}), 'hom');
    assert.strictEqual(appendQueryInput('ho', 'me\r', {}), 'home');
    assert.strictEqual(appendQueryInput('ho', '', { downArrow: true }), 'ho');
    assert.strictEqual(appendQueryInput('ho', 'x', { ctrl: true }), 'ho');
  });

  it('removes the last query character without breaking multibyte characters', () => {
    assert.strictEqual(removeLastQueryCharacter('homey😀'), 'homey');
  });
});
