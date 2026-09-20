import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';
import { createGunzip } from 'node:zlib';

import tar from 'tar-fs';

const dirname = path.dirname(fileURLToPath(import.meta.url));
const FIXTURES_PATH = path.join(dirname, '..', 'fixtures', 'apps');

export async function copyFixtureApp(t, name) {
  const tempPath = await fs.mkdtemp(path.join(os.tmpdir(), `homey-${name}-`));
  const appPath = path.join(tempPath, name);

  t.after(async () => {
    await fs.rm(tempPath, { recursive: true, force: true });
  });

  await fs.cp(path.join(FIXTURES_PATH, name), appPath, { recursive: true });

  return appPath;
}

export async function createManifestApp(t, overrides = {}, options = {}) {
  const { fixture = 'node-basic' } = options;
  const appPath = await copyFixtureApp(t, fixture);
  const manifestPath = path.join(appPath, 'app.json');
  const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

  await fs.writeFile(manifestPath, JSON.stringify({ ...manifest, ...overrides }, null, 2));

  return appPath;
}

export async function listTree(rootPath) {
  const entries = [];

  async function visit(relativePath) {
    const directoryPath = path.join(rootPath, relativePath);
    const children = await fs.readdir(directoryPath, { withFileTypes: true });

    children.sort((left, right) => {
      return left.name.localeCompare(right.name);
    });

    for (const child of children) {
      const childRelativePath = path.join(relativePath, child.name);
      const normalizedPath = childRelativePath.split(path.sep).join('/');

      entries.push(child.isDirectory() ? `${normalizedPath}/` : normalizedPath);

      if (child.isDirectory()) {
        await visit(childRelativePath);
      }
    }
  }

  await visit('');

  return entries;
}

export async function snapshotFixtureApp(name) {
  const fixturePath = path.join(FIXTURES_PATH, name);
  const inventory = await listTree(fixturePath);
  const fileEntries = inventory.filter((entry) => {
    return !entry.endsWith('/');
  });
  const fileSnapshotPromises = fileEntries.map(async (entry) => {
    const filePath = path.join(fixturePath, ...entry.split('/'));
    const contents = await fs.readFile(filePath);
    const sha256 = createHash('sha256').update(contents).digest('hex');

    return { path: entry, sha256 };
  });
  const files = await Promise.all(fileSnapshotPromises);

  return { inventory, files };
}

export async function extractArchive(t, archiveStream) {
  const extractPath = await fs.mkdtemp(path.join(os.tmpdir(), 'homey-archive-'));

  t.after(async () => {
    await fs.rm(extractPath, { recursive: true, force: true });
  });

  await pipeline(archiveStream, createGunzip(), tar.extract(extractPath));

  return extractPath;
}
