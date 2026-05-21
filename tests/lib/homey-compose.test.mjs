import assert from 'node:assert';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';

import HomeyCompose from '../../lib/HomeyCompose.js';

const tempDirs = [];

async function writeJson(filePath, data) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2));
}

async function createComposeApp() {
  const appPath = await fs.mkdtemp(path.join(os.tmpdir(), 'homey-compose-'));
  tempDirs.push(appPath);

  await writeJson(path.join(appPath, 'app.json'), {
    id: 'com.test.compose',
    version: '1.0.0',
    compatibility: '>=13.2.1',
    sdk: 3,
    name: { en: 'Compose Test' },
    description: { en: 'Compose Test' },
    category: ['tools'],
  });
  await fs.mkdir(path.join(appPath, 'locales'));

  return appPath;
}

afterEach(async () => {
  await Promise.all(tempDirs.map((tempDir) => fs.rm(tempDir, { recursive: true, force: true })));
  tempDirs.length = 0;
});

describe('HomeyCompose', () => {
  it('merges capability titleShort from compose locales', async () => {
    const appPath = await createComposeApp();

    await writeJson(path.join(appPath, '.homeycompose', 'capabilities', 'alarm_test.json'), {
      type: 'boolean',
      title: { en: 'Alarm Test' },
      titleShort: { en: 'Alarm' },
      getable: true,
    });
    await writeJson(path.join(appPath, 'drivers', 'test', 'driver.compose.json'), {
      name: { en: 'Test Driver' },
      class: 'socket',
      capabilities: ['alarm_test'],
      capabilitiesOptions: {
        alarm_test: {
          title: { en: 'Driver Alarm Test' },
          titleShort: { en: 'Driver Alarm' },
        },
      },
    });
    await writeJson(path.join(appPath, '.homeycompose', 'locales', 'nl.json'), {
      $capabilities: {
        alarm_test: {
          title: 'Alarm Test NL',
          titleShort: 'Alarm NL',
        },
      },
      $drivers: {
        test: {
          capabilitiesOptions: {
            alarm_test: {
              title: 'Driver Alarm Test NL',
              titleShort: 'Driver Alarm NL',
            },
          },
        },
      },
    });

    await HomeyCompose.buildIfUsed(
      {
        hasHomeyCompose: () => true,
        usesModules: () => false,
      },
      appPath,
    );

    const appJson = JSON.parse(await fs.readFile(path.join(appPath, 'app.json'), 'utf8'));

    assert.deepStrictEqual(appJson.capabilities.alarm_test.title, {
      en: 'Alarm Test',
      nl: 'Alarm Test NL',
    });
    assert.deepStrictEqual(appJson.capabilities.alarm_test.titleShort, {
      en: 'Alarm',
      nl: 'Alarm NL',
    });
    assert.deepStrictEqual(appJson.drivers[0].capabilitiesOptions.alarm_test.title, {
      en: 'Driver Alarm Test',
      nl: 'Driver Alarm Test NL',
    });
    assert.deepStrictEqual(appJson.drivers[0].capabilitiesOptions.alarm_test.titleShort, {
      en: 'Driver Alarm',
      nl: 'Driver Alarm NL',
    });
  });
});
