import assert from 'node:assert';
import { describe, it } from 'node:test';
import { assertSuccess, createIsolatedHomeyHome, removeHomeyHome, runHomey } from './helpers.mjs';

describe('CLI current', () => {
  it('prints a no-active-homey message when no Homey is selected', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['current'], homeyHome);
    assertSuccess(result, 'homey current');
    assert.match(result.stdout, /No active Homey selected\. Run `homey select` to choose one\./);
  });

  it('prints the active Homey when one is selected', (t) => {
    const homeyHome = createIsolatedHomeyHome({
      activeHomey: {
        id: 'abc',
        name: 'My Homey',
      },
    });
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['current'], homeyHome);
    assertSuccess(result, 'homey current');
    assert.match(result.stdout, /Active Homey: My Homey \(abc\)/);
  });
});
