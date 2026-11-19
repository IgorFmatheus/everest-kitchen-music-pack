import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

test('a release inclui o compêndio compilado e todos os scripts carregados no Foundry', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const work = path.join(root, '.generated', 'build-tests');
  fs.mkdirSync(work, { recursive: true });
  const fixture = fs.mkdtempSync(path.join(work, 'case-'));
  for (const file of ['module.json', 'README.md']) fs.copyFileSync(path.join(root, file), path.join(fixture, file));
  fs.cpSync(path.join(root, 'scripts'), path.join(fixture, 'scripts'), { recursive: true });
  fs.mkdirSync(path.join(fixture, 'audio/musicas/urbano'), { recursive: true });
  fs.writeFileSync(path.join(fixture, 'audio/musicas/urbano/faixa #1.mp3'), 'packaging fixture');
  execFileSync(process.execPath, [path.join(fixture, 'scripts/build.mjs')], { env: { ...process.env,
    GITHUB_REPOSITORY: 'exemplo/everest-kitchen-music-pack', RELEASE_TAG: 'v1.1.0' } });
  const stage = path.join(fixture, 'dist/package');
  const manifest = JSON.parse(fs.readFileSync(path.join(stage, 'module.json'), 'utf8'));
  assert.equal(manifest.version, '1.1.0');
  assert.ok(fs.existsSync(path.join(stage, 'packs/musicas/CURRENT')));
  assert.ok(fs.existsSync(path.join(stage, 'audio/musicas/urbano/faixa #1.mp3')));
  for (const module of manifest.esmodules) assert.ok(fs.existsSync(path.join(stage, module)));
  assert.ok(fs.existsSync(path.join(stage, 'scripts/runtime/sync-core.mjs')));
  assert.equal(fs.existsSync(path.join(stage, 'scripts/build.mjs')), false);
});
