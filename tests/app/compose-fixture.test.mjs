import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import App from '../../lib/App.js';
import HomeyCompose from '../../lib/HomeyCompose.js';
import { copyFixtureApp } from './helpers.mjs';

describe('Compose fixture characterization', () => {
  it('generates the same manifest repeatedly from Compose sources', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-compose-esm');

    await HomeyCompose.buildIfUsed(App, appPath);
    const firstManifestText = await fs.readFile(path.join(appPath, 'app.json'), 'utf8');

    await HomeyCompose.buildIfUsed(App, appPath);
    const secondManifestText = await fs.readFile(path.join(appPath, 'app.json'), 'utf8');
    const manifest = JSON.parse(secondManifestText);

    assert.strictEqual(secondManifestText, firstManifestText);
    assert.strictEqual(manifest.esm, true);
    assert.deepStrictEqual(manifest.capabilities.alarm_fixture.title, {
      en: 'Fixture Alarm',
      nl: 'Fixturealarm',
    });
    assert.deepStrictEqual(manifest.capabilities.alarm_fixture.titleShort, {
      en: 'Alarm',
      nl: 'Alarm',
    });
    assert.deepStrictEqual(manifest.drivers[0].name, {
      en: 'Fixture Device',
      nl: 'Fixture-apparaat',
    });
    assert.strictEqual(manifest.flow.actions[0].id, 'set_fixture');
    assert.strictEqual(manifest.flow.actions[0].title.nl, 'Stel de fixture in');
  });

  it('does not change a non-Compose app', async (t) => {
    const appPath = await copyFixtureApp(t, 'node-basic');
    const before = await fs.readFile(path.join(appPath, 'app.json'), 'utf8');

    await HomeyCompose.buildIfUsed(App, appPath);

    assert.strictEqual(await fs.readFile(path.join(appPath, 'app.json'), 'utf8'), before);
  });
});
