import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const serverLockPath = path.resolve(here, '..', 'package-lock.json');
const clientPkgPath = path.resolve(here, '..', '..', 'client', 'package.json');
const clientLockPath = path.resolve(here, '..', '..', 'client', 'package-lock.json');

test('body-parser is pinned to the CVE-fixed version 2.4.0', () => {
  const lock = JSON.parse(readFileSync(serverLockPath, 'utf8'));
  const bp = lock.packages['node_modules/body-parser'];
  assert.ok(bp, 'body-parser entry missing from server lockfile');
  assert.equal(bp.version, '2.4.0');
});

test('vite is pinned to the CVE-fixed version 8.0.16', () => {
  const pkg = JSON.parse(readFileSync(clientPkgPath, 'utf8'));
  const spec = pkg.devDependencies && pkg.devDependencies.vite;
  assert.ok(spec, 'vite devDependency missing from client package.json');
  assert.match(spec, /^\^8\./);

  const lock = JSON.parse(readFileSync(clientLockPath, 'utf8'));
  const vite = lock.packages['node_modules/vite'];
  assert.ok(vite, 'vite entry missing from client lockfile');
  assert.equal(vite.version, '8.0.16');
});
