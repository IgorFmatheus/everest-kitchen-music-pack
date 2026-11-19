import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_ID as ID, PACK_ID, findSourcePlaylist, planPlaylistSync, summarizePlans } from '../scripts/runtime/sync-core.mjs';

const pathFor = name => `modules/${ID}/audio/musicas/urbano/${name}.mp3`;
const sound = (id, name, extras = {}) => ({ _id: id, name, path: pathFor(name), playing: false, pausedTime: 0,
  volume: 0.5, repeat: false, channel: 'music', flags: { [ID]: { sourceSoundId: id, sourceName: name } }, ...extras });
const source = () => ({ _id: 'source1', name: 'Músicas / Urbano', sounds: [sound('a', 'A'), sound('b', 'B')],
  flags: { [ID]: { sourcePlaylistId: 'source1', group: 'musicas/urbano' } } });
const world = () => ({ _id: 'world1', name: 'Meu nome', folder: 'minha-pasta', mode: -1, fade: 7000,
  flags: { [ID]: { sourcePlaylistId: 'source1', syncedVersion: '1.0.0' } },
  sounds: [sound('a', 'Nome personalizado', { path: pathFor('arquivo-antigo'), volume: 0.1, repeat: true,
    flags: { [ID]: { sourceSoundId: 'a', sourceName: 'A' }, outroModulo: { valor: 1 } } }),
  sound('old', 'Removida'), sound('local', 'Minha faixa', { path: 'audio/local.mp3', flags: {} }),
  sound('legacy', 'Sem vínculo', { flags: {} })] });

function patch(target, changes) {
  for (const [key, value] of Object.entries(changes)) {
    const parts = key.split('.');
    let object = target;
    for (const part of parts.slice(0, -1)) object = object[part] ??= {};
    object[parts.at(-1)] = structuredClone(value);
  }
}

test('sincroniza faixas gerenciadas preservando controles locais e faixas extras', () => {
  const local = world();
  const plan = planPlaylistSync(local, source(), '1.1.0');
  assert.equal(plan.create.length, 1);
  assert.deepEqual(plan.delete, ['old']);
  assert.equal(plan.update[0].path, pathFor('A'));
  for (const field of ['volume', 'repeat', 'name', 'sort', 'playing', 'pausedTime', 'channel']) {
    assert.equal(Object.hasOwn(plan.update[0], field), false, field);
  }
  assert.equal(Object.hasOwn(plan.playlistUpdate, 'name'), false);
  assert.equal(Object.hasOwn(plan.playlistUpdate, 'folder'), false);
  assert.equal(Object.hasOwn(plan.playlistUpdate, 'mode'), false);
  assert.equal(Object.hasOwn(plan.create[0], '_id'), false);
  for (const update of plan.update) patch(local.sounds.find(s => s._id === update._id), update);
  local.sounds.push(...plan.create.map((s, i) => ({ ...s, _id: `new${i}` })));
  local.sounds = local.sounds.filter(s => !plan.delete.includes(s._id));
  patch(local, plan.playlistUpdate);
  assert.equal(local.sounds.find(s => s._id === 'a').flags.outroModulo.valor, 1);
  const second = planPlaylistSync(local, source(), '1.1.0');
  assert.equal(second.create.length + second.update.length + second.delete.length, 0);
});

test('reconhece importações antigas por proveniência e escapa caminhos para comparação', () => {
  const official = source();
  const imported = { ...world(), flags: {}, _stats: { compendiumSource: `Compendium.${PACK_ID}.Playlist.source1` } };
  assert.equal(findSourcePlaylist(imported, [official]), official);
  imported._stats = {};
  imported.flags.core = { sourceId: `Compendium.${PACK_ID}.source1` };
  assert.equal(findSourcePlaylist(imported, [official]), official);
  const legacy = { _id: 'legacy', name: official.name, sounds: [{ path: pathFor('A%20B') }] };
  const encodedSource = { ...official, sounds: [sound('a', 'A B')] };
  assert.equal(findSourcePlaylist(legacy, [encodedSource]), encodedSource);
  assert.equal(findSourcePlaylist({ name: official.name, sounds: [{ path: 'audio/local.mp3' }] }, [official]), null);
});

test('não remapeia uma origem removida nem adota playlists ambíguas', () => {
  const local = world();
  local.flags[ID].sourcePlaylistId = 'origem-removida';
  assert.equal(findSourcePlaylist(local, [source()]), null);
  const legacy = { name: source().name, sounds: [sound('a', 'A')] };
  assert.equal(findSourcePlaylist(legacy, [source(), { ...source(), _id: 'outro' }]), null);
});

test('não altera playlists em reprodução ou pausadas', () => {
  for (const extras of [{ playing: true }, { sounds: [sound('a', 'A', { pausedTime: 10 })] }]) {
    const plan = planPlaylistSync({ ...world(), ...extras }, source(), '1.1.0');
    assert.equal(plan.skipped, true);
    assert.equal(plan.create.length + plan.update.length + plan.delete.length, 0);
    assert.equal(summarizePlans([plan]).playlists, 0);
  }
});

test('atualiza título de origem sem sobrescrever título personalizado', () => {
  const local = world();
  local.sounds = [sound('a', 'A')];
  const updated = source();
  updated.sounds = [sound('a', 'Novo título')];
  assert.equal(planPlaylistSync(local, updated, '1.1.0').update[0].name, 'Novo título');
  local.sounds[0].name = 'Título do MJ';
  assert.equal(Object.hasOwn(planPlaylistSync(local, updated, '1.1.0').update[0], 'name'), false);
});
