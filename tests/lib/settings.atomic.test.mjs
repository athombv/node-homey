import assert from 'node:assert';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';

import Settings from '../../lib/Settings.js';

describe('Settings atomic mutation', () => {
  it('preserves concurrent updates from independent repository instances', async (t) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'homey-settings-'));
    const settingsPath = path.join(directory, 'settings.json');
    t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
    fs.writeFileSync(settingsPath, '{}');

    const first = new Settings();
    const second = new Settings();
    first._settingsPath = settingsPath;
    second._settingsPath = settingsPath;

    await Promise.all([first.set('first', 1), second.set('second', 2)]);

    assert.deepStrictEqual(JSON.parse(fs.readFileSync(settingsPath, 'utf8')), {
      first: 1,
      second: 2,
    });
    assert.strictEqual(fs.existsSync(`${settingsPath}.lock`), false);
  });
});
