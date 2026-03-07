import assert from 'node:assert';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.join(__dirname, '..', '..');

function runHomey(args, env = {}) {
  return spawnSync('node', ['bin/homey.mjs', ...args], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    env: {
      ...process.env,
      HOMEY_SKIP_STARTUP_NOTIFIERS: '1',
      NO_UPDATE_NOTIFIER: '1',
      ...env,
    },
  });
}

describe('CLI completion', () => {
  it('shows the root version option in help output', () => {
    const result = runHomey(['--help']);

    assert.strictEqual(
      result.status,
      0,
      `Expected exit code 0 for "homey --help", got ${result.status}.\nSTDERR:\n${result.stderr}\nSTDOUT:\n${result.stdout}`,
    );

    assert.match(result.stdout, /--version/);
    assert.doesNotMatch(result.stdout, /homey update check failed/);
    assert.doesNotMatch(result.stderr, /homey update check failed/);
  });

  it('prints the top-level CLI version', () => {
    const result = runHomey(['--version']);

    assert.strictEqual(
      result.status,
      0,
      `Expected exit code 0 for "homey --version", got ${result.status}.\nSTDERR:\n${result.stderr}\nSTDOUT:\n${result.stdout}`,
    );

    assert.match(result.stdout, /^[0-9]+\.[0-9]+\.[0-9]+\s*$/);
    assert.doesNotMatch(result.stdout, /homey update check failed/);
    assert.doesNotMatch(result.stderr, /homey update check failed/);
  });

  it('prints a bash completion script', () => {
    const result = runHomey(['completion']);

    assert.strictEqual(
      result.status,
      0,
      `Expected exit code 0 for "homey completion", got ${result.status}.\nSTDERR:\n${result.stderr}\nSTDOUT:\n${result.stdout}`,
    );

    assert.match(result.stdout, /###-begin-homey-completions-###/);
    assert.doesNotMatch(result.stdout, /homey update check failed/);
    assert.doesNotMatch(result.stderr, /homey update check failed/);
  });

  it('prints a zsh completion script when SHELL points to zsh', () => {
    const result = runHomey(['completion'], { SHELL: '/bin/zsh' });

    assert.strictEqual(
      result.status,
      0,
      `Expected exit code 0 for "SHELL=/bin/zsh homey completion", got ${result.status}.\nSTDERR:\n${result.stderr}\nSTDOUT:\n${result.stdout}`,
    );

    assert.match(result.stdout, /#compdef homey/);
    assert.doesNotMatch(result.stdout, /homey update check failed/);
    assert.doesNotMatch(result.stderr, /homey update check failed/);
  });

  it('returns top-level command suggestions for completion queries', () => {
    const result = runHomey(['--get-yargs-completions', '']);

    assert.strictEqual(
      result.status,
      0,
      `Expected exit code 0 for "--get-yargs-completions", got ${result.status}.\nSTDERR:\n${result.stderr}\nSTDOUT:\n${result.stdout}`,
    );

    assert.match(result.stdout, /^completion$/m);
    assert.match(result.stdout, /^app$/m);
    assert.match(result.stdout, /^api$/m);
    assert.doesNotMatch(result.stdout, /homey update check failed/);
    assert.doesNotMatch(result.stderr, /homey update check failed/);
  });

  it('handles completion queries that include the command name token', () => {
    const result = runHomey(['--get-yargs-completions', 'homey', 'api']);

    assert.strictEqual(
      result.status,
      0,
      `Expected exit code 0 for "--get-yargs-completions homey api", got ${result.status}.\nSTDERR:\n${result.stderr}\nSTDOUT:\n${result.stdout}`,
    );

    assert.match(result.stdout, /^api$/m);
    assert.doesNotMatch(result.stdout, /^devices$/m);
    assert.doesNotMatch(result.stdout, /homey update check failed/);
    assert.doesNotMatch(result.stderr, /homey update check failed/);
  });
});
