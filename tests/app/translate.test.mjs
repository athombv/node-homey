import assert from 'node:assert';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import Translate from '../../lib/app/Translate.js';

const translate = new Translate({ appPath: '/path/to/app' });

describe('translateFile', () => {
  it('translates tag arrays and surrounding fields while preserving existing translations', async (t) => {
    const appPath = await fs.mkdtemp(path.join(os.tmpdir(), 'homey-translate-'));
    t.after(async () => {
      await fs.rm(appPath, { recursive: true, force: true });
    });

    const file = path.join(appPath, 'app.json');
    const manifest = {
      name: { en: 'Example' },
      tags: { en: ['heating', 'lighting'], nl: ['verwarming', 'verlichting'] },
      description: { en: 'Control devices' },
    };
    await fs.writeFile(file, JSON.stringify(manifest));

    const translator = new Translate({ appPath });
    const create = t.mock.fn(async ({ messages }) => {
      const text = messages[1].content;
      assert.strictEqual(typeof text, 'string');

      return { choices: [{ message: { content: `Translated ${text}` } }] };
    });
    translator._openai = { chat: { completions: { create } } };

    await translator._translateFile(file, ['nl', 'de'], 'Example');

    const result = JSON.parse(await fs.readFile(file, 'utf8'));
    assert.deepStrictEqual(result, {
      name: { en: 'Example', nl: 'Translated Example', de: 'Translated Example' },
      tags: {
        en: ['heating', 'lighting'],
        nl: ['verwarming', 'verlichting'],
        de: ['Translated heating', 'Translated lighting'],
      },
      description: {
        en: 'Control devices',
        nl: 'Translated Control devices',
        de: 'Translated Control devices',
      },
    });
    assert.strictEqual(create.mock.callCount(), 6);

    await translator._translateFile(file, ['nl', 'de'], 'Example');
    assert.strictEqual(create.mock.callCount(), 6);
    assert.deepStrictEqual(JSON.parse(await fs.readFile(file, 'utf8')), result);
  });

  it('preserves empty tag arrays without requesting translations', async (t) => {
    const appPath = await fs.mkdtemp(path.join(os.tmpdir(), 'homey-translate-'));
    t.after(async () => {
      await fs.rm(appPath, { recursive: true, force: true });
    });

    const file = path.join(appPath, 'app.json');
    await fs.writeFile(file, JSON.stringify({ tags: { en: [] } }));

    const translator = new Translate({ appPath });
    const create = t.mock.fn();
    translator._openai = { chat: { completions: { create } } };

    await translator._translateFile(file, ['nl'], 'Example');

    assert.deepStrictEqual(JSON.parse(await fs.readFile(file, 'utf8')), {
      tags: { en: [], nl: [] },
    });
    assert.strictEqual(create.mock.callCount(), 0);
  });
});

describe('extractTranslationTasks', () => {
  it('skips unsupported English values while discovering nested translations', () => {
    const obj = {
      count: { en: 42 },
      enabled: { en: true },
      missing: { en: null },
      mixed: { en: ['heating', 42] },
      nested: { en: { title: { en: 'Heating' } } },
    };

    assert.deepStrictEqual(translate._extractTranslationTasks(obj, [], ['nl']), [
      {
        path: ['nested', 'en', 'title'],
        source: 'Heating',
        existing: { en: 'Heating' },
        missing: ['nl'],
      },
    ]);
  });
});

describe('applyTranslationOrder', () => {
  it('should reorder keys according to Translate.LANGUAGES', () => {
    const obj = {
      foo: {
        bar: {
          nl: 'Dutch',
          en: 'English',
          de: 'German',
        },
      },
    };
    const path = ['foo', 'bar'];

    translate._applyTranslationOrder(obj, path, []);

    const keys = Object.keys(obj.foo.bar);
    assert.deepStrictEqual(keys, ['en', 'nl', 'de']);
  });

  it('should preserve relative order of existing keys', () => {
    const obj = {
      foo: {
        en: 'English',
        de: 'German',
        nl: 'Dutch',
      },
    };
    const path = ['foo'];
    const currentKeys = ['en', 'de'];

    translate._applyTranslationOrder(obj, path, currentKeys);

    const keys = Object.keys(obj.foo);
    assert.deepStrictEqual(keys, ['en', 'nl', 'de']);
  });

  it('should place non-standard keys after standard languages', () => {
    const obj = {
      foo: {
        en: 'English',
        nl: 'Dutch',
        custom: 'Custom',
      },
    };
    const path = ['foo'];
    const currentKeys = ['en', 'custom'];

    translate._applyTranslationOrder(obj, path, currentKeys);

    const keys = Object.keys(obj.foo);
    assert.deepStrictEqual(keys, ['en', 'nl', 'custom']);
  });

  it('should throw error if path is not an array', () => {
    assert.throws(() => {
      translate._applyTranslationOrder({}, 'not-an-array');
    }, /TypeError: applyTranslationOrder expects `path` to be an array of keys/);
  });

  it('should throw error if path is empty', () => {
    assert.throws(() => {
      translate._applyTranslationOrder({}, []);
    }, /Error: applyTranslationOrder received an empty path/);
  });

  it('should throw error if obj is not an object', () => {
    assert.throws(() => {
      translate._applyTranslationOrder(null, ['foo']);
    }, /TypeError: applyTranslationOrder expects `obj` to be an object/);
  });

  it('should throw error if path does not exist', () => {
    assert.throws(() => {
      translate._applyTranslationOrder({ a: 1 }, ['a', 'b']);
    }, /Error: Invalid path: "a" does not exist or is not an object/);
  });
});
