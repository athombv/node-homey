'use strict';

/**
 * Helper to group tests.
 */
function describe(name, fn) {
  console.log(`\n${name}`);
  fn();
}

/**
 * Helper to run tests with descriptive names.
 */
function it(description, testFn) {
  try {
    testFn();
    console.log(`  ✅ ${description}`);
  } catch (err) {
    console.error(`  ❌ ${description}`);
    throw err;
  }
}

module.exports = {
  describe,
  it,
};
