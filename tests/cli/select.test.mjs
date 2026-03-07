import assert from 'node:assert';
import { describe, it } from 'node:test';
import { assertSuccess, createIsolatedHomeyHome, removeHomeyHome, runHomey } from './helpers.mjs';

describe('CLI select', () => {
  it('prints a no-active-homey message for "select --current" when no Homey is selected', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['select', '--current'], homeyHome);
    assertSuccess(result, 'homey select --current');
    assert.match(result.stdout, /No active Homey selected\. Run `homey select` to choose one\./);
  });

  it('prints the active Homey for "select --current" when one is selected', (t) => {
    const homeyHome = createIsolatedHomeyHome({
      activeHomey: {
        id: 'abc',
        name: 'My Homey',
      },
    });
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['select', '--current'], homeyHome);
    assertSuccess(result, 'homey select --current');
    assert.match(result.stdout, /Active Homey: My Homey \(abc\)/);
  });

  it('prints the active Homey when the stored selection also contains platform metadata', (t) => {
    const homeyHome = createIsolatedHomeyHome({
      activeHomey: {
        id: 'abc',
        name: 'My Homey',
        platform: 'cloud',
      },
    });
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['select', '--current'], homeyHome);
    assertSuccess(result, 'homey select --current');
    assert.match(result.stdout, /Active Homey: My Homey \(abc\)/);
  });
});
