import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { test } from 'node:test';

import inquirer from 'inquirer';

import App from '../../lib/App.js';
import { copyFixtureApp } from './helpers.mjs';

async function createLanDriver(t, discoveryAnswers) {
  const appPath = await copyFixtureApp(t, 'node-compose-esm');
  const app = new App(appPath);
  const answers = [
    { driverName: 'Test Lamp' },
    { driverClass: 'light', driverCapabilities: ['onoff'] },
    { wirelessType: 'lan' },
    ...discoveryAnswers,
    { confirm: true },
  ];

  t.mock.method(inquirer, 'prompt', async (questions) => {
    assert.ok(answers.length > 0, 'Unexpected prompt');
    const response = answers.shift();

    for (const question of questions) {
      if (response[question.name] === undefined && typeof question.default === 'function') {
        response[question.name] = await question.default(response);
      }

      const value = response[question.name];

      if (question.choices) {
        const choices =
          typeof question.choices === 'function'
            ? await question.choices(response)
            : question.choices;
        const choiceValues = choices.map((choice) => {
          return typeof choice === 'string' ? choice : choice.value;
        });
        const selectedValues = Array.isArray(value) ? value : [value];

        for (const selectedValue of selectedValues) {
          assert.ok(choiceValues.includes(selectedValue), `${question.name}: invalid choice`);
        }
      }

      if (question.validate) {
        assert.equal(await question.validate(value, response), true, question.name);
      }
    }

    return response;
  });

  await app.createDriver();
  assert.equal(answers.length, 0, 'All wizard answers should be consumed');

  const driver = JSON.parse(
    await fs.readFile(path.join(appPath, 'drivers', 'test-lamp', 'driver.compose.json'), 'utf8'),
  );

  return { appPath, driver };
}

const strategies = [
  {
    type: 'mdns-sd',
    answers: { name: 'test-service', protocol: 'tcp', id: 'txt.id' },
  },
  {
    type: 'ssdp',
    answers: { search: 'urn:schemas-upnp-org:device:Basic:1', id: 'usn' },
  },
  {
    type: 'mac',
    answers: { mac: 'AA:BB:CC', more: false },
  },
];

for (const strategy of strategies) {
  test(`driver creation references the created ${strategy.type} discovery strategy`, async (t) => {
    const discoveryId = `lamp-${strategy.type}`;
    const { appPath, driver } = await createLanDriver(t, [
      { createDiscovery: true },
      { title: discoveryId, type: strategy.type },
      strategy.answers,
      { confirm: true },
    ]);

    assert.equal(driver.discovery, discoveryId);
    assert.deepEqual(driver.connectivity, ['lan']);
    const discovery = JSON.parse(
      await fs.readFile(
        path.join(appPath, '.homeycompose', 'discovery', `${driver.discovery}.json`),
        'utf8',
      ),
    );
    assert.equal(discovery.type, strategy.type);
  });
}

test('driver creation omits discovery when strategy creation is cancelled', async (t) => {
  const { appPath, driver } = await createLanDriver(t, [
    { createDiscovery: true },
    { title: 'cancelled-discovery', type: 'mdns-sd' },
    { name: 'test-service', protocol: 'tcp', id: 'txt.id' },
    { confirm: false },
  ]);

  assert.equal('discovery' in driver, false);
  await assert.rejects(
    fs.access(path.join(appPath, '.homeycompose', 'discovery', 'cancelled-discovery.json')),
    { code: 'ENOENT' },
  );
});

test('driver creation omits discovery when strategy creation is declined', async (t) => {
  const { driver } = await createLanDriver(t, [{ createDiscovery: false }]);

  assert.equal('discovery' in driver, false);
  assert.deepEqual(driver.connectivity, ['lan']);
});
