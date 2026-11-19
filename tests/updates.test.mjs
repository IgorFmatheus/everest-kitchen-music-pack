import test from 'node:test';
import assert from 'node:assert/strict';
import { MODULE_ID as ID, PACK_ID } from '../scripts/runtime/sync-core.mjs';

const hooks = new Map();
globalThis.Hooks = { once: (event, handler) => hooks.set(event, handler) };
const runtime = await import('../scripts/runtime/updates.mjs');
const clone = value => structuredClone(value);
function apply(target, changes) {
  for (const [key, value] of Object.entries(changes)) {
    const parts = key.split('.');
    let object = target;
    for (const part of parts.slice(0, -1)) object = object[part] ??= {};
    object[parts.at(-1)] = clone(value);
  }
}
function setup() {
  const notifications = [];
  const dialogs = [];
  const values = new Map();
  const registered = new Map();
  const source = { _id: 'p1', name: 'Músicas / Urbano', flags: { [ID]: { group: 'musicas/urbano' } }, sounds: [
    { _id: 's1', name: 'Nova', path: `modules/${ID}/audio/musicas/urbano/nova.mp3`, flags: {}, volume: 0.5, playing: false },
  ] };
  const local = { _id: 'world', name: 'Minha playlist', flags: {},
    _stats: { compendiumSource: `Compendium.${PACK_ID}.Playlist.p1` }, sounds: [] };
  const writes = [];
  const document = {
    toObject: () => clone(local),
    async updateEmbeddedDocuments(type, patches) { writes.push('update'); for (const p of patches) apply(local.sounds.find(s => s._id === p._id), p); },
    async createEmbeddedDocuments(type, entries) { writes.push('create'); local.sounds.push(...entries.map((s, i) => ({ ...clone(s), _id: `generated${i}` }))); },
    async deleteEmbeddedDocuments(type, ids) { writes.push('delete'); local.sounds = local.sounds.filter(s => !ids.includes(s._id)); },
    async update(patch) { writes.push('playlist'); apply(local, patch); },
  };
  globalThis.game = {
    user: { isGM: true, id: 'gm' }, users: { activeGM: { id: 'gm' } },
    modules: new Map([[ID, { version: '1.1.0' }]]),
    packs: new Map([[PACK_ID, { getDocuments: async () => [{ toObject: () => clone(source) }] }]]),
    playlists: [document],
    settings: {
      register(scope, key, config) { registered.set(key, config); values.set(key, config.default); },
      registerMenu(scope, key, config) { registered.set(key, config); },
      get: (scope, key) => values.get(key),
      async set(scope, key, value) { values.set(key, value); },
    },
  };
  globalThis.ui = { notifications: Object.fromEntries(['info', 'warn', 'error'].map(level => [level, message => notifications.push({ level, message })])) };
  globalThis.foundry = { applications: { api: { ApplicationV2: class {}, DialogV2: {
    confirm: async config => { dialogs.push(config); return true; },
    wait: async config => { dialogs.push(config); return 'close'; },
  } } }, utils: { isNewerVersion: (a, b) => {
    const x = a.split('.').map(Number); const y = b.split('.').map(Number);
    for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] > y[i];
    return false;
  } } };
  runtime.registerSettings();
  values.set('checkOnStartup', false);
  return { source, local, document, writes, dialogs, notifications, values, registered };
}

test('registra menu exclusivo do MJ e usa confirmação por padrão', () => {
  const state = setup();
  assert.equal(hooks.get('init'), runtime.registerSettings);
  assert.equal(hooks.get('ready'), runtime.onReady);
  assert.equal(state.registered.get('updates').restricted, true);
  assert.equal(state.values.get('autoSync'), false);
});

test('sincronização executa APIs de documentos sem duplicar faixas ao repetir', async () => {
  const state = setup();
  assert.equal((await runtime.synchronizeImported()).completed, 1);
  assert.equal(state.local.sounds.length, 1);
  assert.equal(state.local.flags[ID].syncedVersion, '1.1.0');
  await runtime.synchronizeImported();
  assert.equal(state.local.sounds.length, 1);
  assert.equal(state.writes.filter(w => w === 'create').length, 1);
});

test('cancelamento e usuários sem autoridade não escrevem no mundo', async () => {
  const state = setup();
  foundry.applications.api.DialogV2.confirm = async () => false;
  await runtime.synchronizeImported();
  assert.deepEqual(state.writes, []);
  game.user.isGM = false;
  await runtime.synchronizeImported({ confirm: false });
  game.user.isGM = true;
  game.users.activeGM.id = 'outro-gm';
  await runtime.synchronizeImported({ confirm: false });
  assert.deepEqual(state.writes, []);
});

test('nova versão instalada oferece sincronização e modo automático não precisa de popup', async () => {
  let state = setup();
  await runtime.onReady();
  assert.equal(state.dialogs.length, 1);
  assert.equal(state.local.sounds.length, 1);
  await runtime.onReady();
  assert.equal(state.dialogs.length, 1);
  state = setup();
  state.values.set('autoSync', true);
  await runtime.onReady();
  assert.equal(state.dialogs.length, 0);
  assert.equal(state.local.sounds.length, 1);
});

test('verificação remota avisa uma vez, nunca instala pacote nem altera playlists', async () => {
  const state = setup();
  const previousFetch = globalThis.fetch;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, 'https://api.github.com/repos/IgorFmatheus/everest-kitchen-music-pack/releases/latest');
    assert.equal(options.method, undefined);
    return { ok: true, json: async () => ({ tag_name: 'v1.2.0', draft: false, prerelease: false }) };
  };
  try {
    assert.equal((await runtime.checkForUpdates({ silent: true })).newer, true);
    await runtime.checkForUpdates({ silent: true });
    assert.equal(state.dialogs.length, 1);
    assert.deepEqual(state.writes, []);
  } finally { globalThis.fetch = previousFetch; }
});

test('falha de rede manual informa erro sem afetar os documentos', async () => {
  const state = setup();
  const previousFetch = globalThis.fetch;
  const previousError = console.error;
  globalThis.fetch = async () => ({ ok: false, status: 403 });
  console.error = () => {};
  try {
    assert.equal(await runtime.checkForUpdates(), null);
    assert.equal(state.notifications.at(-1).level, 'error');
    assert.deepEqual(state.writes, []);
  } finally { globalThis.fetch = previousFetch; console.error = previousError; }
});
