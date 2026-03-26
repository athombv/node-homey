import assert from 'node:assert';
import { describe, it } from 'node:test';
import {
  createHomeySelectStore,
  selectHomeySelectEffectiveSelectedId,
  selectHomeySelectInteractiveCount,
  selectHomeySelectListModel,
  selectHomeySelectRowModel,
  selectHomeySelectSelectedHomey,
  selectHomeySelectVisibleCount,
} from '../../lib/ui/homey-select/homey-select-store.mjs';

const sampleHomeys = [
  {
    id: 'homey-office',
    name: 'Office',
    platform: 'local',
    state: 'online',
  },
  {
    id: 'homey-garage',
    name: 'Garage',
    platform: 'cloud',
    state: 'offline',
  },
  {
    id: 'homey-attic',
    name: 'Attic',
    platform: 'cloud',
    state: 'online',
  },
];

function createWindowHomeys() {
  return [
    {
      id: 'homey-1',
      name: 'Homey 1',
      platform: 'local',
      state: 'online',
    },
    {
      id: 'homey-2',
      name: 'Homey 2',
      platform: 'local',
      state: 'online',
    },
    {
      id: 'homey-3',
      name: 'Homey 3',
      platform: 'cloud',
      state: 'online',
    },
    {
      id: 'homey-4',
      name: 'Homey 4',
      platform: 'cloud',
      state: 'online',
    },
    {
      id: 'homey-5',
      name: 'Homey 5',
      platform: 'local',
      state: 'online',
    },
    {
      id: 'homey-6',
      name: 'Homey 6',
      platform: 'cloud',
      state: 'online',
    },
    {
      id: 'homey-7',
      name: 'Homey 7',
      platform: 'local',
      state: 'online',
    },
  ];
}

describe('homey select store', () => {
  it('prefers the active Homey for the effective selection and row model', () => {
    const store = createHomeySelectStore({
      activeHomey: {
        id: 'homey-attic',
      },
      homeys: sampleHomeys,
    });

    assert.strictEqual(selectHomeySelectInteractiveCount(store.getState()), 2);
    assert.strictEqual(selectHomeySelectVisibleCount(store.getState()), 2);
    assert.strictEqual(selectHomeySelectEffectiveSelectedId(store.getState()), 'homey-attic');
    assert.deepStrictEqual(selectHomeySelectRowModel(store.getState(), 'homey-attic'), {
      homey: sampleHomeys[2],
      isCurrent: true,
      isSelected: true,
    });
  });

  it('updates query state and falls back to the active Homey when the old selection is filtered out', () => {
    const store = createHomeySelectStore({
      activeHomey: {
        id: 'homey-attic',
      },
      homeys: sampleHomeys,
    });

    store.setState({
      selectedId: 'homey-office',
    });
    store.getState().appendQueryInput('a');
    store.getState().appendQueryInput('t');
    store.getState().appendQueryInput('t');

    assert.strictEqual(store.getState().query, 'att');
    assert.strictEqual(selectHomeySelectVisibleCount(store.getState()), 1);
    assert.strictEqual(selectHomeySelectEffectiveSelectedId(store.getState()), 'homey-attic');
    assert.strictEqual(selectHomeySelectSelectedHomey(store.getState())?.id, 'homey-attic');
  });

  it('wraps navigation at the start and end of the visible list', () => {
    const store = createHomeySelectStore({
      homeys: sampleHomeys,
    });

    store.getState().moveSelection(-1);
    assert.strictEqual(selectHomeySelectEffectiveSelectedId(store.getState()), 'homey-attic');

    store.getState().moveSelection(1);
    assert.strictEqual(selectHomeySelectEffectiveSelectedId(store.getState()), 'homey-office');
  });

  it('derives list window overflow metadata from the store state', () => {
    const store = createHomeySelectStore({
      homeys: createWindowHomeys(),
    });

    store.setState({
      selectedId: 'homey-4',
    });

    assert.deepStrictEqual(selectHomeySelectListModel(store.getState(), 5), {
      hasInteractiveHomeys: true,
      hiddenAboveCount: 2,
      hiddenBelowCount: 2,
      listState: 'items',
      query: '',
      rowIds: ['homey-3', 'homey-4', 'homey-5'],
    });
  });

  it('transitions from loading to loaded data without sharing state outside the store', () => {
    const store = createHomeySelectStore({
      isLoading: true,
    });

    assert.strictEqual(selectHomeySelectListModel(store.getState(), 4).listState, 'loading');

    store.getState().setLoadedData({
      activeHomey: {
        id: 'homey-attic',
      },
      homeys: sampleHomeys,
    });

    assert.strictEqual(store.getState().isLoading, false);
    assert.strictEqual(selectHomeySelectEffectiveSelectedId(store.getState()), 'homey-attic');
    assert.strictEqual(selectHomeySelectListModel(store.getState(), 4).listState, 'items');
  });
});
