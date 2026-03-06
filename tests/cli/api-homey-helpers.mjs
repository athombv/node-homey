import assert from 'node:assert';

function assertFailure(result, command) {
  assert.notStrictEqual(
    result.status,
    0,
    `Expected non-zero exit code for "${command}".\nSTDERR:\n${result.stderr}\nSTDOUT:\n${result.stdout}`,
  );

  assert.doesNotMatch(result.stdout, /homey update check failed/);
  assert.doesNotMatch(result.stderr, /homey update check failed/);
}

export default {
  assertFailure,
};
