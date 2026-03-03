'use strict';

import assert from 'node:assert';
import { describe, it } from 'node:test';
import Translate from '../../lib/app/Translate.js';

const translate = new Translate({ appPath: '/path/to/app' });

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
