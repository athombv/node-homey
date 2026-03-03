'use strict';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import { createIsolatedHomeyHome, removeHomeyHome, runHomey } from './helpers.mjs';

describe('CLI api homey', () => {
  it('lists all supported managers in completion', (t) => {
    const homeyHome = createIsolatedHomeyHome();
    t.after(() => removeHomeyHome(homeyHome));

    const result = runHomey(['--get-yargs-completions', 'api', 'homey', ''], homeyHome);

    assert.strictEqual(result.status, 0);
    assert.match(result.stdout, /^devices$/m);
    assert.match(result.stdout, /^flow$/m);
    assert.match(result.stdout, /^raw$/m);
    assert.match(result.stdout, /^schema$/m);
    assert.match(result.stdout, /^system$/m);
  });
});
