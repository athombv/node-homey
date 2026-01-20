'use strict';

const assert = require('assert');
const Translate = require('../../lib/app/Translate');

/**
 * Mock class for Translate to access protected/private methods if needed,
 * or just use the class directly since it's exported.
 */

function testBasicReordering() {
  console.log('Testing basic reordering...');
  const obj = {
    foo: {
      bar: {
        nl: 'Dutch',
        en: 'English',
        de: 'German',
      },
    },
  };
  const translate = new Translate({ app: {} });
  const path = ['foo', 'bar'];

  // Translate.LANGUAGES = ['en', 'nl', 'da', 'de', 'es', 'fr', 'it', 'no', 'sv', 'pl', 'ru', 'ko', 'ar']

  translate._applyTranslationOrder(obj, path, []);

  const keys = Object.keys(obj.foo.bar);
  assert.deepStrictEqual(keys, ['en', 'nl', 'de'], 'Keys should be ordered according to Translate.LANGUAGES');
  console.log('✅ Basic reordering passed');
}

function testPreserveExistingOrder() {
  console.log('Testing preservation of existing keys order...');
  const obj = {
    foo: {
      en: 'English',
      de: 'German',
      nl: 'Dutch',
    },
  };
  const translate = new Translate({ app: {} });
  const path = ['foo'];
  const currentKeys = ['en', 'de']; // nl is new

  // existing order was en, de. nl is added.
  // Translate.LANGUAGES has en, nl, de in that order.
  // But because en and de were already there, their relative order should be preserved.
  // nl should be placed according to Translate.LANGUAGES relative to others?
  // Let's check the logic:
  // if isExistingA && isExistingB: return currentKeys.indexOf(a) - currentKeys.indexOf(b);
  // So en and de will keep their relative order.

  translate._applyTranslationOrder(obj, path, currentKeys);

  const keys = Object.keys(obj.foo);
  // en (index 0 in LANGUAGES), nl (index 1), de (index 3)
  // en and de are existing.
  // when comparing en vs nl: en is existing, nl is new. both in LANGUAGES. result = index(en) - index(nl) = 0 - 1 = -1. en before nl.
  // when comparing de vs nl: de is existing, nl is new. both in LANGUAGES. result = index(de) - index(nl) = 3 - 1 = 2. nl before de.
  // when comparing en vs de: both existing. currentKeys.indexOf(en) - currentKeys.indexOf(de) = 0 - 1 = -1. en before de.
  // So expected: en, nl, de.

  assert.deepStrictEqual(keys, ['en', 'nl', 'de'], 'New keys should be inserted at the correct position while preserving existing order');
  console.log('✅ Preservation of existing keys order passed');
}

function testNonStandardKeys() {
  console.log('Testing keys not in Translate.LANGUAGES...');
  const obj = {
    foo: {
      en: 'English',
      nl: 'Dutch',
      custom: 'Custom',
    },
  };
  const translate = new Translate({ app: {} });
  const path = ['foo'];
  const currentKeys = ['en', 'custom']; // nl is new

  translate._applyTranslationOrder(obj, path, currentKeys);

  const keys = Object.keys(obj.foo);
  // en vs custom: both existing. en before custom.
  // en vs nl: en existing, nl new. both in LANGUAGES. en before nl.
  // custom vs nl: custom existing, nl new. custom NOT in LANGUAGES.
  // logic: if (indexExisting !== -1 && indexNew !== -1) ... else return isExistingA ? -1 : 1;
  // custom is existingA, nl is newB. custom is NOT in LANGUAGES (indexExisting == -1).
  // So it returns -1. custom before nl.
  // Expected: en, custom, nl.

  assert.deepStrictEqual(keys, ['en', 'nl', 'custom'], 'Non-standard keys should be handled correctly');
  console.log('✅ Non-standard keys passed');
}

function testErrors() {
  console.log('Testing error cases...');
  const translate = new Translate({ app: {} });

  assert.throws(() => {
    translate._applyTranslationOrder({}, 'not-an-array');
  }, /TypeError: applyTranslationOrder expects `path` to be an array of keys/);

  assert.throws(() => {
    translate._applyTranslationOrder({}, []);
  }, /Error: applyTranslationOrder received an empty path/);

  assert.throws(() => {
    translate._applyTranslationOrder(null, ['foo']);
  }, /TypeError: applyTranslationOrder expects `obj` to be an object/);

  assert.throws(() => {
    translate._applyTranslationOrder({ a: 1 }, ['a', 'b']);
  }, /Error: Invalid path: "a" does not exist or is not an object/);

  console.log('✅ Error cases passed');
}

try {
  testBasicReordering();
  testPreserveExistingOrder();
  testNonStandardKeys();
  testErrors();
  console.log('\nAll tests passed! 🎉');
} catch (err) {
  console.error('\n❌ Test failed:');
  console.error(err);
  process.exit(1);
}
