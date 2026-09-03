import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { afterEach, describe, it, mock } from 'node:test';

import PackageManager from '../../lib/PackageManager.js';

const tempDirs = [];

function setupFakeApp({ packageJson, lockfiles = [] } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-test-'));
  tempDirs.push(dir);
  if (packageJson !== undefined) {
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(packageJson));
  }
  for (const lock of lockfiles) {
    fs.writeFileSync(path.join(dir, lock), '');
  }
  return dir;
}

afterEach(() => {
  mock.restoreAll();
  while (tempDirs.length) {
    fs.rmSync(tempDirs.pop(), { recursive: true, force: true });
  }
});

describe('PackageManager.detect', () => {
  // Tests that hit the DEFAULT branch stub detectInstalled to keep them
  // deterministic and free of host-environment dependencies.
  const stubInstalled = (entries) => {
    mock.method(PackageManager, 'detectInstalled', async () => entries);
  };

  it('reports `default` / npm when no signal is present and both managers are installed', async () => {
    stubInstalled([{ name: 'npm', version: '10.0.0' }, { name: 'pnpm', version: '11.1.0' }]);
    const dir = setupFakeApp({ packageJson: { name: 'x' } });
    assert.deepStrictEqual(await PackageManager.detect(dir), { name: 'npm', reason: 'default' });
  });

  it('reports `default` / pnpm when no signal is present and only pnpm is installed', async () => {
    stubInstalled([{ name: 'pnpm', version: '11.1.0' }]);
    const dir = setupFakeApp({ packageJson: { name: 'x' } });
    assert.deepStrictEqual(await PackageManager.detect(dir), { name: 'pnpm', reason: 'default' });
  });

  it('reports `default` / npm when no signal is present and only npm is installed', async () => {
    stubInstalled([{ name: 'npm', version: '10.0.0' }]);
    const dir = setupFakeApp({ packageJson: { name: 'x' } });
    assert.deepStrictEqual(await PackageManager.detect(dir), { name: 'npm', reason: 'default' });
  });

  it('reports `default` / npm when no signal is present and neither manager is installed', async () => {
    stubInstalled([]);
    const dir = setupFakeApp({ packageJson: { name: 'x' } });
    assert.deepStrictEqual(await PackageManager.detect(dir), { name: 'npm', reason: 'default' });
  });

  it('reports `pnpm-lockfile` / pnpm when only pnpm-lock.yaml is present', async () => {
    const dir = setupFakeApp({ packageJson: { name: 'x' }, lockfiles: ['pnpm-lock.yaml'] });
    assert.deepStrictEqual(await PackageManager.detect(dir), { name: 'pnpm', reason: 'pnpm-lockfile' });
  });

  it('reports `npm-lockfile` / npm when only package-lock.json is present', async () => {
    const dir = setupFakeApp({ packageJson: { name: 'x' }, lockfiles: ['package-lock.json'] });
    assert.deepStrictEqual(await PackageManager.detect(dir), { name: 'npm', reason: 'npm-lockfile' });
  });

  it('prefers pnpm from the `packageManager` field over a `package-lock.json`', async () => {
    const dir = setupFakeApp({
      packageJson: { name: 'x', packageManager: 'pnpm@9.0.0' },
      lockfiles: ['package-lock.json'],
    });
    assert.deepStrictEqual(await PackageManager.detect(dir), { name: 'pnpm', reason: 'packageManager-field' });
  });

  it('prefers npm from the `packageManager` field over a `pnpm-lock.yaml`', async () => {
    const dir = setupFakeApp({
      packageJson: { name: 'x', packageManager: 'npm@10.0.0' },
      lockfiles: ['pnpm-lock.yaml'],
    });
    assert.deepStrictEqual(await PackageManager.detect(dir), { name: 'npm', reason: 'packageManager-field' });
  });

  it('reports `ambiguous-lockfiles` / npm when both lockfiles are present and no `packageManager` field is set', async () => {
    const dir = setupFakeApp({
      packageJson: { name: 'x' },
      lockfiles: ['pnpm-lock.yaml', 'package-lock.json'],
    });
    assert.deepStrictEqual(await PackageManager.detect(dir), { name: 'npm', reason: 'ambiguous-lockfiles' });
  });

  it('uses the `packageManager` field to disambiguate when both lockfiles exist', async () => {
    const dir = setupFakeApp({
      packageJson: { name: 'x', packageManager: 'pnpm@9.0.0' },
      lockfiles: ['pnpm-lock.yaml', 'package-lock.json'],
    });
    assert.deepStrictEqual(await PackageManager.detect(dir), { name: 'pnpm', reason: 'packageManager-field' });
  });

  it('falls through to default-npm when packageManager names an unsupported manager and no lockfile is present', async () => {
    stubInstalled([{ name: 'npm', version: '10.0.0' }, { name: 'pnpm', version: '11.1.0' }]);
    const dir = setupFakeApp({ packageJson: { name: 'x', packageManager: 'yarn@4.0.0' } });
    assert.deepStrictEqual(await PackageManager.detect(dir), { name: 'npm', reason: 'default' });
  });

  it('lockfile wins when packageManager names an unsupported manager but a lockfile exists', async () => {
    const dir = setupFakeApp({
      packageJson: { name: 'x', packageManager: 'yarn@4.0.0' },
      lockfiles: ['pnpm-lock.yaml'],
    });
    assert.deepStrictEqual(await PackageManager.detect(dir), { name: 'pnpm', reason: 'pnpm-lockfile' });
  });

});

describe('PackageManager.detectInstalled', () => {
  it('returns entries for each manager whose `--version` succeeds', async () => {
    const probe = async (cmd) => {
      if (cmd === 'npm --version') return { stdout: '10.0.0\n' };
      if (cmd === 'pnpm --version') return { stdout: '11.1.0\n' };
      throw new Error('unexpected');
    };
    assert.deepStrictEqual(await PackageManager.detectInstalled(probe), [
      { name: 'npm', version: '10.0.0' },
      { name: 'pnpm', version: '11.1.0' },
    ]);
  });

  it('omits managers whose `--version` throws', async () => {
    const probe = async (cmd) => {
      if (cmd === 'npm --version') return { stdout: '10.0.0' };
      throw new Error('not installed');
    };
    assert.deepStrictEqual(await PackageManager.detectInstalled(probe), [
      { name: 'npm', version: '10.0.0' },
    ]);
  });

  it('returns an empty array when no manager is installed', async () => {
    const result = await PackageManager.detectInstalled(async () => {
      throw new Error('not installed');
    });
    assert.deepStrictEqual(result, []);
  });

  it('trims trailing whitespace from the reported version', async () => {
    const probe = async (cmd) => {
      if (cmd === 'npm --version') return { stdout: '10.0.0\r\n  ' };
      throw new Error('not installed');
    };
    const [npm] = await PackageManager.detectInstalled(probe);
    assert.strictEqual(npm.version, '10.0.0');
  });
});

describe('PackageManager.parseJsonTolerant', () => {
  it('parses a JSON object after leading non-JSON noise', () => {
    const stdout = 'Already up to date\n{"compilerOptions":{"outDir":"./.homeybuild"}}';
    const parsed = PackageManager.parseJsonTolerant(stdout, '{');
    assert.deepStrictEqual(parsed, { compilerOptions: { outDir: './.homeybuild' } });
  });

  it('parses a JSON array after leading non-JSON noise', () => {
    const stdout = 'Already up to date\n[{"name":"app","dependencies":{}}]';
    const parsed = PackageManager.parseJsonTolerant(stdout, '[');
    assert.deepStrictEqual(parsed, [{ name: 'app', dependencies: {} }]);
  });

  it('parses clean JSON with no prefix', () => {
    assert.deepStrictEqual(PackageManager.parseJsonTolerant('{"a":1}', '{'), { a: 1 });
    assert.deepStrictEqual(PackageManager.parseJsonTolerant('[1,2,3]', '['), [1, 2, 3]);
  });

  it('throws a descriptive error when the opener char is absent', () => {
    assert.throws(
      () => PackageManager.parseJsonTolerant('no json here', '{'),
      /no JSON object found in stdout: no json here/,
    );
    assert.throws(
      () => PackageManager.parseJsonTolerant('still nothing', '['),
      /no JSON array found in stdout: still nothing/,
    );
  });
});

describe('PackageManager._collectPnpmProdDeps', () => {
  const nm = (...segments) => path.join('node_modules', ...segments);

  it('walks the prod dependency tree and emits {srcPath, relPath} hoisted at top-level', () => {
    const stdout = JSON.stringify([
      {
        name: 'app',
        dependencies: {
          'homey-log': {
            version: '2.1.2',
            path: '/app/node_modules/.pnpm/homey-log@2.1.2/node_modules/homey-log',
            dependencies: {
              raven: {
                version: '2.6.2',
                path: '/app/node_modules/.pnpm/raven@2.6.2/node_modules/raven',
                dependencies: {
                  cookie: {
                    version: '0.3.1',
                    path: '/app/node_modules/.pnpm/cookie@0.3.1/node_modules/cookie',
                  },
                },
              },
            },
          },
        },
      },
    ]);

    const pm = new PackageManager('/app', 'pnpm');
    const deps = pm._collectPnpmProdDeps(stdout);

    assert.deepStrictEqual(
      deps.map((d) => d.relPath).sort(),
      [nm('cookie'), nm('homey-log'), nm('raven')].sort(),
    );
    const raven = deps.find((d) => d.relPath === nm('raven'));
    assert.strictEqual(raven.srcPath, '/app/node_modules/.pnpm/raven@2.6.2/node_modules/raven');
  });

  it('ignores unsavedDependencies (hoisted dev-transitive bleed)', () => {
    const stdout = JSON.stringify([
      {
        name: 'app',
        dependencies: {
          'homey-log': {
            version: '2.1.2',
            path: '/app/node_modules/.pnpm/homey-log@2.1.2/node_modules/homey-log',
          },
        },
        unsavedDependencies: {
          'ast-v8-to-istanbul': {
            version: '1.0.0',
            path: '/app/node_modules/ast-v8-to-istanbul',
          },
          chai: { version: '5.0.0', path: '/app/node_modules/chai' },
        },
      },
    ]);

    const pm = new PackageManager('/app', 'pnpm');
    const relPaths = pm._collectPnpmProdDeps(stdout).map((d) => d.relPath);
    assert.deepStrictEqual(relPaths, [nm('homey-log')]);
  });

  it('handles scoped package names verbatim', () => {
    const stdout = JSON.stringify([
      {
        name: 'app',
        dependencies: {
          '@scope/pkg': {
            version: '1.0.0',
            path: '/app/node_modules/.pnpm/@scope+pkg@1.0.0/node_modules/@scope/pkg',
          },
        },
      },
    ]);

    const pm = new PackageManager('/app', 'pnpm');
    const deps = pm._collectPnpmProdDeps(stdout);
    assert.deepStrictEqual(
      deps.map((d) => d.relPath),
      [nm('@scope/pkg')],
    );
  });

  it('deduplicates a package that appears multiple times with the same install path', () => {
    const stdout = JSON.stringify([
      {
        name: 'app',
        dependencies: {
          a: {
            path: '/app/node_modules/.pnpm/a@1.0.0/node_modules/a',
            dependencies: {
              shared: {
                path: '/app/node_modules/.pnpm/shared@1.0.0/node_modules/shared',
              },
            },
          },
          b: {
            path: '/app/node_modules/.pnpm/b@1.0.0/node_modules/b',
            dependencies: {
              shared: {
                path: '/app/node_modules/.pnpm/shared@1.0.0/node_modules/shared',
              },
            },
          },
        },
      },
    ]);

    const pm = new PackageManager('/app', 'pnpm');
    const deps = pm._collectPnpmProdDeps(stdout);
    const shared = deps.filter((d) => d.relPath === nm('shared'));
    assert.strictEqual(shared.length, 1);
    assert.strictEqual(shared[0].srcPath, '/app/node_modules/.pnpm/shared@1.0.0/node_modules/shared');
  });

  it('nests a conflicting version under its parent in an npm-style layout', () => {
    const stdout = JSON.stringify([
      {
        name: 'app',
        dependencies: {
          a: {
            path: '/app/node_modules/.pnpm/a@1.0.0/node_modules/a',
            dependencies: {
              shared: {
                version: '1.0.0',
                path: '/app/node_modules/.pnpm/shared@1.0.0/node_modules/shared',
              },
            },
          },
          b: {
            path: '/app/node_modules/.pnpm/b@1.0.0/node_modules/b',
            dependencies: {
              shared: {
                version: '2.0.0',
                path: '/app/node_modules/.pnpm/shared@2.0.0/node_modules/shared',
              },
            },
          },
        },
      },
    ]);

    const pm = new PackageManager('/app', 'pnpm');
    const deps = pm._collectPnpmProdDeps(stdout);
    const byRelPath = new Map(deps.map((d) => [d.relPath, d.srcPath]));

    assert.strictEqual(
      byRelPath.get(nm('shared')),
      '/app/node_modules/.pnpm/shared@1.0.0/node_modules/shared',
    );
    assert.strictEqual(
      byRelPath.get(nm('b', 'node_modules', 'shared')),
      '/app/node_modules/.pnpm/shared@2.0.0/node_modules/shared',
    );
  });

  it('threads parentRelPath through recursion so conflicts more than one level deep nest correctly', () => {
    const stdout = JSON.stringify([
      {
        name: 'app',
        dependencies: {
          shared: {
            version: '1.0.0',
            path: '/app/node_modules/.pnpm/shared@1.0.0/node_modules/shared',
          },
          a: {
            path: '/app/node_modules/.pnpm/a@1.0.0/node_modules/a',
            dependencies: {
              c: {
                path: '/app/node_modules/.pnpm/c@1.0.0/node_modules/c',
                dependencies: {
                  shared: {
                    version: '2.0.0',
                    path: '/app/node_modules/.pnpm/shared@2.0.0/node_modules/shared',
                  },
                },
              },
            },
          },
        },
      },
    ]);

    const pm = new PackageManager('/app', 'pnpm');
    const deps = pm._collectPnpmProdDeps(stdout);
    const byRelPath = new Map(deps.map((d) => [d.relPath, d.srcPath]));

    assert.strictEqual(
      byRelPath.get(nm('shared')),
      '/app/node_modules/.pnpm/shared@1.0.0/node_modules/shared',
    );
    // `c` is itself hoisted (no conflict), so the nested shared@2 lands under c, not under a/c.
    assert.strictEqual(
      byRelPath.get(nm('c', 'node_modules', 'shared')),
      '/app/node_modules/.pnpm/shared@2.0.0/node_modules/shared',
    );
    assert.strictEqual(byRelPath.get(nm('c')), '/app/node_modules/.pnpm/c@1.0.0/node_modules/c');
  });

  it('tolerates leading noise before the JSON array', () => {
    const stdout =
      'Already up to date\n' +
      JSON.stringify([{ name: 'app', dependencies: { foo: { path: '/x' } } }]);
    const pm = new PackageManager('/app', 'pnpm');
    const relPaths = pm._collectPnpmProdDeps(stdout).map((d) => d.relPath);
    assert.deepStrictEqual(relPaths, [nm('foo')]);
  });

  it('skips entries without a path (unresolved peers, dependency stubs)', () => {
    const stdout = JSON.stringify([
      {
        name: 'app',
        dependencies: {
          good: { path: '/app/node_modules/.pnpm/good@1/node_modules/good' },
          missing: { version: '1.0.0' },
        },
      },
    ]);

    const pm = new PackageManager('/app', 'pnpm');
    const relPaths = pm._collectPnpmProdDeps(stdout).map((d) => d.relPath);
    assert.deepStrictEqual(relPaths, [nm('good')]);
  });
});

describe('PackageManager command mapping', () => {
  function captureExec(pm) {
    const calls = [];
    pm._exec = async (cmd) => {
      calls.push(cmd);
      return { stdout: '', stderr: '' };
    };
    return calls;
  }

  it('maps `install` to `npm install --save` for npm', async () => {
    const pm = new PackageManager('/app', 'npm');
    const calls = captureExec(pm);
    await pm.install(['foo', 'bar']);
    assert.deepStrictEqual(calls, ['npm install --save foo bar']);
  });

  it('maps `install` to `pnpm add` for pnpm', async () => {
    const pm = new PackageManager('/app', 'pnpm');
    const calls = captureExec(pm);
    await pm.install(['foo', 'bar']);
    assert.deepStrictEqual(calls, ['pnpm add foo bar']);
  });

  it('maps `installDev` to `npm install --save-dev` for npm', async () => {
    const pm = new PackageManager('/app', 'npm');
    const calls = captureExec(pm);
    await pm.installDev(['foo']);
    assert.deepStrictEqual(calls, ['npm install --save-dev foo']);
  });

  it('maps `installDev` to `pnpm add -D` for pnpm', async () => {
    const pm = new PackageManager('/app', 'pnpm');
    const calls = captureExec(pm);
    await pm.installDev(['foo']);
    assert.deepStrictEqual(calls, ['pnpm add -D foo']);
  });

  it('maps `uninstall` to `npm uninstall` for npm', async () => {
    const pm = new PackageManager('/app', 'npm');
    const calls = captureExec(pm);
    await pm.uninstall(['foo']);
    assert.deepStrictEqual(calls, ['npm uninstall foo']);
  });

  it('maps `uninstall({dev: true})` to `npm uninstall -D` for npm', async () => {
    const pm = new PackageManager('/app', 'npm');
    const calls = captureExec(pm);
    await pm.uninstall(['foo'], { dev: true });
    assert.deepStrictEqual(calls, ['npm uninstall -D foo']);
  });

  it('maps `uninstall` to `pnpm remove` for pnpm', async () => {
    const pm = new PackageManager('/app', 'pnpm');
    const calls = captureExec(pm);
    await pm.uninstall(['foo']);
    assert.deepStrictEqual(calls, ['pnpm remove foo']);
  });

  it('maps `uninstall({dev: true})` to `pnpm remove -D` for pnpm', async () => {
    const pm = new PackageManager('/app', 'pnpm');
    const calls = captureExec(pm);
    await pm.uninstall(['foo'], { dev: true });
    assert.deepStrictEqual(calls, ['pnpm remove -D foo']);
  });

  it('maps `installAll` to `<pm> install` for both managers', async () => {
    const npm = new PackageManager('/app', 'npm');
    const pnpm = new PackageManager('/app', 'pnpm');
    const npmCalls = captureExec(npm);
    const pnpmCalls = captureExec(pnpm);
    await npm.installAll();
    await pnpm.installAll();
    assert.deepStrictEqual(npmCalls, ['npm install']);
    assert.deepStrictEqual(pnpmCalls, ['pnpm install']);
  });

  it('maps `list` to `<pm> list` and returns its stdout for both managers', async () => {
    const npm = new PackageManager('/app', 'npm');
    const pnpm = new PackageManager('/app', 'pnpm');
    npm._exec = async (cmd) => ({ stdout: `(npm) ${cmd}`, stderr: '' });
    pnpm._exec = async (cmd) => ({ stdout: `(pnpm) ${cmd}`, stderr: '' });
    assert.strictEqual(await npm.list(), '(npm) npm list');
    assert.strictEqual(await pnpm.list(), '(pnpm) pnpm list');
  });

  it('routes `copyProductionDependencies` to the npm or pnpm method based on `this.name`', async () => {
    const routed = [];
    const pmNpm = new PackageManager('/app', 'npm');
    pmNpm._copyProductionDependenciesNpm = async () => routed.push('npm');
    pmNpm._copyProductionDependenciesPnpm = async () => routed.push('npm-wrong');
    const pmPnpm = new PackageManager('/app', 'pnpm');
    pmPnpm._copyProductionDependenciesNpm = async () => routed.push('pnpm-wrong');
    pmPnpm._copyProductionDependenciesPnpm = async () => routed.push('pnpm');
    await pmNpm.copyProductionDependencies('/build');
    await pmPnpm.copyProductionDependencies('/build');
    assert.deepStrictEqual(routed, ['npm', 'pnpm']);
  });

  it('maps `exec` to `npx` for npm and to `pnpm --silent exec` for pnpm', async () => {
    const npm = new PackageManager('/app', 'npm');
    const pnpm = new PackageManager('/app', 'pnpm');
    const npmCalls = captureExec(npm);
    const pnpmCalls = captureExec(pnpm);
    await npm.exec('tsc --showConfig');
    await pnpm.exec('tsc --showConfig');
    assert.deepStrictEqual(npmCalls, ['npx tsc --showConfig']);
    assert.deepStrictEqual(pnpmCalls, ['pnpm --silent exec tsc --showConfig']);
  });

  it('maps `run(script)` to `<pm> run <script>` for both managers', async () => {
    const npm = new PackageManager('/app', 'npm');
    const pnpm = new PackageManager('/app', 'pnpm');
    const npmCalls = captureExec(npm);
    const pnpmCalls = captureExec(pnpm);
    await npm.run('build');
    await pnpm.run('build');
    assert.deepStrictEqual(npmCalls, ['npm run build']);
    assert.deepStrictEqual(pnpmCalls, ['pnpm run build']);
  });
});

describe('PackageManager missing-binary detection', () => {
  it('detects ENOENT as a missing binary', () => {
    const pm = new PackageManager('/app', 'pnpm');
    const err = new Error('spawn pnpm ENOENT');
    err.code = 'ENOENT';
    assert.strictEqual(pm._isMissingBinaryError(err), true);
  });

  it('detects Windows `is not recognized` stderr as a missing binary', () => {
    const pm = new PackageManager('/app', 'pnpm');
    const err = new Error('Command failed');
    err.stderr = "'pnpm' is not recognized as an internal or external command";
    assert.strictEqual(pm._isMissingBinaryError(err), true);
  });

  it('detects POSIX `command not found` as a missing binary', () => {
    const pm = new PackageManager('/app', 'pnpm');
    const err = new Error('pnpm: command not found');
    assert.strictEqual(pm._isMissingBinaryError(err), true);
  });

  it('does not flag unrelated errors as missing binary', () => {
    const pm = new PackageManager('/app', 'pnpm');
    const err = new Error('ERR_INVALID_VERSION something something');
    assert.strictEqual(pm._isMissingBinaryError(err), false);
  });

  it('explains the lockfile-triggered detection when reason is `pnpm-lockfile`', () => {
    const pm = new PackageManager('/app', 'pnpm', 'pnpm-lockfile');
    const msg = pm._missingBinaryMessage();
    assert.match(msg, /pnpm-lock\.yaml/);
    assert.match(msg, /tried to use `pnpm`/);
    assert.match(msg, /Install `pnpm`/);
  });

  it('explains the lockfile-triggered detection when reason is `npm-lockfile`', () => {
    const pm = new PackageManager('/app', 'npm', 'npm-lockfile');
    const msg = pm._missingBinaryMessage();
    assert.match(msg, /package-lock\.json/);
    assert.match(msg, /tried to use `npm`/);
  });

  it('references both lockfiles when reason is `ambiguous-lockfiles`', () => {
    const pm = new PackageManager('/app', 'npm', 'ambiguous-lockfiles');
    const msg = pm._missingBinaryMessage();
    assert.match(msg, /pnpm-lock\.yaml/);
    assert.match(msg, /package-lock\.json/);
    assert.match(msg, /defaulted to `npm`/);
    assert.match(msg, /packageManager/);
  });

  it('clarifies that npm was a fallback (not an affirmative detection) when reason is `default`', () => {
    const pm = new PackageManager('/app', 'npm', 'default');
    const msg = pm._missingBinaryMessage();
    assert.match(msg, /No package manager is configured/);
    assert.match(msg, /defaulted to `npm`/);
    assert.doesNotMatch(msg, /^Detected `npm`/);
  });

  it('references the `packageManager` field when reason is `packageManager-field`', () => {
    const pm = new PackageManager('/app', 'pnpm', 'packageManager-field');
    const msg = pm._missingBinaryMessage();
    assert.match(msg, /`packageManager` field/);
    assert.match(msg, /set to `pnpm`/);
  });

  it('appends stderr and stdout to the error message on command failure', async () => {
    const pm = new PackageManager(process.cwd(), 'pnpm');
    // Single-quoted JS / double-quoted shell — works on both cmd.exe and POSIX sh.
    try {
      await pm._exec('node -e "process.stderr.write(\'boom\'); process.exit(1)"');
      assert.fail('expected throw');
    } catch (err) {
      assert.match(err.message, /Command failed/);
      assert.match(err.message, /boom/);
    }
  });

  it('tags missing-binary errors with code `PM_NOT_INSTALLED`', async () => {
    // Real cwd + a binary that doesn't exist → shell reports "not recognized"
    // (Windows) or "command not found" (POSIX). Both match _isMissingBinaryError.
    const pm = new PackageManager(process.cwd(), 'pnpm', 'pnpm-lockfile');
    try {
      await pm._exec('definitely-not-a-real-binary-xyz123');
      assert.fail('expected throw');
    } catch (err) {
      assert.strictEqual(err.code, PackageManager.ERROR_CODES.PM_NOT_INSTALLED);
      assert.strictEqual(err.pmName, 'pnpm');
    }
  });
});

