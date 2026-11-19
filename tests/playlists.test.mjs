import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractPack } from '@foundryvtt/foundryvtt-cli';
import { scanAudio, createPlaylistDocuments, generatePlaylists } from '../scripts/generate-playlists.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const work = path.join(root, '.generated', 'tests');
fs.mkdirSync(work, { recursive: true });
function fixture(files) {
  const directory = fs.mkdtempSync(path.join(work, 'case-'));
  for (const [name, content] of Object.entries(files)) {
    const filename = path.join(directory, 'audio', name);
    fs.mkdirSync(path.dirname(filename), { recursive: true });
    fs.writeFileSync(filename, content);
  }
  return directory;
}

test('o banco recompilado preserva faixas, pastas e caminhos especiais', async () => {
  const project = fixture({
    'musicas/medieval/combate/Batalha #1 ç.mp3': 'fixture',
    'musicas/urbano/Noite.mp3': 'fixture',
    'musica-ambiente/medieval/florestas/Floresta.ogg': 'fixture',
    'musica-ambiente/terror/Lareira.mp3': 'fixture',
  });
  const first = await generatePlaylists(project);
  const output = path.join(project, 'unpacked');
  await extractPack(first.destination, output);
  const records = fs.readdirSync(output).map(name => JSON.parse(fs.readFileSync(path.join(output, name), 'utf8')));
  const playlists = records.filter(doc => doc._key.startsWith('!playlists!'));
  const folders = records.filter(doc => doc._key.startsWith('!folders!'));
  assert.equal(playlists.length, 4);
  assert.equal(folders.length, 4);
  assert.equal(playlists.flatMap(p => p.sounds).length, 4);
  const folderIds = new Set(folders.map(f => f._id));
  for (const playlist of playlists) {
    assert.ok(folderIds.has(playlist.folder));
    const ambient = playlist.channel === 'environment';
    assert.equal(playlist.mode, ambient ? -1 : 0);
    assert.equal(playlist.playing, false);
    for (const sound of playlist.sounds) {
      assert.equal(sound.channel, playlist.channel);
      assert.equal(sound.repeat, ambient);
      assert.equal(sound.playing, false);
      assert.equal(sound._key, `!playlists.sounds!${playlist._id}.${sound._id}`);
      const relative = decodeURIComponent(sound.path).replace('modules/everest-kitchen-music-pack/', '');
      assert.ok(fs.existsSync(path.join(project, relative)), relative);
    }
  }
  assert.ok(playlists.flatMap(p => p.sounds).some(s => s.path.includes('%231%20%C3%A7')));
  // Uma faixa removida não deve permanecer como documento fantasma na recompilação.
  fs.unlinkSync(path.join(project, 'audio/musicas/urbano/Noite.mp3'));
  const second = await generatePlaylists(project);
  const output2 = path.join(project, 'unpacked-again');
  await extractPack(second.destination, output2);
  const updated = fs.readdirSync(output2).map(name => JSON.parse(fs.readFileSync(path.join(output2, name), 'utf8')));
  assert.equal(updated.filter(doc => doc._key.startsWith('!playlists!')).length, 3);
  const priorIds = new Map(first.playlists.map(p => [p.name, p._id]));
  for (const playlist of second.playlists) assert.equal(playlist._id, priorIds.get(playlist.name));
});

test('rejeita subcategorias fora de Medieval', () => {
  const project = fixture({ 'musicas/urbano/clubes/Faixa.mp3': 'fixture' });
  assert.throws(() => scanAudio(project), /Somente medieval admite subcategoria/);
});

test('rejeita ponteiros LFS sem o arquivo real', () => {
  const project = fixture({ 'musicas/urbano/Faixa.mp3': 'version https://git-lfs.github.com/spec/v1\n' });
  assert.throws(() => scanAudio(project), /Baixe o objeto LFS/);
});

test('IDs são estáveis e cópias continuam sendo faixas distintas', () => {
  const tracks = [
    { relative: 'musicas/urbano/A.mp3', type: 'musicas', category: 'urbano', group: 'musicas/urbano' },
    { relative: 'musicas/urbano/A - copia.mp3', type: 'musicas', category: 'urbano', group: 'musicas/urbano' },
  ];
  const first = createPlaylistDocuments(tracks);
  const second = createPlaylistDocuments([...tracks].reverse());
  assert.deepEqual(first, second);
  assert.equal(new Set(first.playlists[0].sounds.map(s => s._id)).size, 2);
});
