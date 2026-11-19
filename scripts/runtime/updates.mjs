import { MODULE_ID, PACK_ID, findSourcePlaylist, isPlaybackActive, planPlaylistSync, summarizePlans } from './sync-core.mjs';

const title = 'Everest Kitchen Music Pack';
const repository = 'https://github.com/IgorFmatheus/everest-kitchen-music-pack';
const latestApi = 'https://api.github.com/repos/IgorFmatheus/everest-kitchen-music-pack/releases/latest';
let syncing = false;
let checking = false;
let menuOpen = false;
const installedVersion = () => String(game.modules.get(MODULE_ID).version);
const escape = text => String(text).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const dataOf = document => document.toObject();
const isPrimaryGM = () => game.user.isGM && (!game.users.activeGM || game.users.activeGM.id === game.user.id);
const report = error => { console.error(`${MODULE_ID}:`, error); ui.notifications.error(`${title}: ${error.message}`); };

export async function getImportState() {
  const pack = game.packs.get(PACK_ID);
  if (!pack) throw new Error('O compêndio da biblioteca não está disponível.');
  const sources = (await pack.getDocuments()).map(dataOf);
  const matches = [];
  for (const playlist of game.playlists) {
    const world = dataOf(playlist);
    const source = findSourcePlaylist(world, sources);
    if (source) matches.push({ playlist, source, world });
  }
  return { sources, matches };
}

export async function checkForUpdates({ silent = false } = {}) {
  if (!game.user.isGM || checking) return null;
  checking = true;
  try {
    const response = await fetch(latestApi, { headers: { Accept: 'application/vnd.github+json' },
      cache: 'no-store', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error(`Não foi possível consultar o GitHub (HTTP ${response.status}). Tente novamente mais tarde.`);
    const release = await response.json();
    const version = String(release.tag_name ?? '').replace(/^v/, '');
    if (!/^\d+\.\d+\.\d+$/.test(version) || release.draft || release.prerelease) {
      throw new Error('A release não contém uma versão estável válida.');
    }
    const current = installedVersion();
    const newer = foundry.utils.isNewerVersion(version, current);
    const noticeKey = `${current}:${version}`;
    if (newer && (!silent || game.settings.get(MODULE_ID, 'lastRemoteNotice') !== noticeKey)) {
      await foundry.applications.api.DialogV2.wait({
        window: { title: `${title} — Atualização disponível` }, rejectClose: false,
        content: `<p>Está disponível a versão <strong>${escape(version)}</strong>. A instalada é ${escape(current)}.</p>
          <p>Volte à tela inicial do Foundry, abra <strong>Add-on Modules</strong> e atualize este módulo.
          Depois, entre novamente no mundo para sincronizar as playlists importadas.</p>
          <p><a href="${repository}/releases/tag/v${version}" target="_blank" rel="noopener noreferrer">Ver release</a></p>`,
        buttons: [{ action: 'close', label: 'Entendi', default: true }],
      });
      await game.settings.set(MODULE_ID, 'lastRemoteNotice', noticeKey);
    } else if (!newer && !silent) {
      ui.notifications.info(`${title}: o módulo instalado está atualizado (${current}).`);
    }
    return { version, newer };
  } catch (error) {
    if (silent) console.warn(`${MODULE_ID}: verificação de release indisponível.`, error);
    else report(error);
    return null;
  } finally { checking = false; }
}

export async function synchronizeImported({ confirm = true } = {}) {
  if (!game.user.isGM) return null;
  if (!isPrimaryGM()) {
    ui.notifications.warn('Faça a sincronização com o MJ ativo principal para evitar atualizações simultâneas.');
    return null;
  }
  if (syncing) { ui.notifications.info('A biblioteca já está sendo sincronizada.'); return null; }
  syncing = true;
  try {
    const version = installedVersion();
    const { matches } = await getImportState();
    if (!matches.length) {
      ui.notifications.info('Nenhuma playlist desta biblioteca foi importada neste mundo. Importe pelo compêndio primeiro.');
      return null;
    }
    const summary = summarizePlans(matches.map(({ world, source }) => planPlaylistSync(world, source, version)));
    if (!summary.playlists) {
      ui.notifications.warn('As playlists da biblioteca estão em reprodução ou pausadas. Pare as faixas e tente novamente.');
      return { ...summary, completed: 0 };
    }
    if (confirm) {
      const accepted = await foundry.applications.api.DialogV2.confirm({
        window: { title: `${title} — Atualizar playlists` }, rejectClose: false,
        content: `<p>Sincronizar <strong>${summary.playlists} playlists já importadas</strong> com a versão instalada ${escape(version)}?</p>
          <p>${summary.create} faixas novas; ${summary.update} faixas com vínculos ou fontes a atualizar;
          ${summary.delete} faixas gerenciadas removidas da biblioteca.</p>
          <p>Volumes, repetição, nomes personalizados, pastas e faixas locais serão preservados.
          ${summary.skipped ? `${summary.skipped} playlists em reprodução ou pausadas serão ignoradas.` : ''}</p>`,
        yes: { label: 'Atualizar playlists' }, no: { label: 'Cancelar' },
      });
      if (!accepted) return null;
    }
    let completed = 0;
    let skipped = 0;
    for (const { playlist, source } of matches) {
      const plan = planPlaylistSync(dataOf(playlist), source, version);
      if (plan.skipped) { skipped++; continue; }
      if (plan.update.length) await playlist.updateEmbeddedDocuments('PlaylistSound', plan.update);
      if (isPlaybackActive(dataOf(playlist))) { skipped++; continue; }
      if (plan.create.length) await playlist.createEmbeddedDocuments('PlaylistSound', plan.create);
      if (isPlaybackActive(dataOf(playlist))) { skipped++; continue; }
      if (plan.delete.length) await playlist.deleteEmbeddedDocuments('PlaylistSound', plan.delete);
      await playlist.update(plan.playlistUpdate);
      completed++;
    }
    ui.notifications.info(`${title}: ${completed} playlists sincronizadas.${skipped ? ` ${skipped} ficaram para depois por estarem ativas.` : ''}`);
    return { ...summary, completed, skipped };
  } catch (error) { report(error); return null; }
  finally { syncing = false; }
}

export async function openUpdateMenu() {
  if (!game.user.isGM || menuOpen) return;
  menuOpen = true;
  try {
    const { matches } = await getImportState();
    const version = installedVersion();
    const pending = matches.filter(({ world }) => world.flags?.[MODULE_ID]?.syncedVersion !== version).length;
    const action = await foundry.applications.api.DialogV2.wait({
      window: { title: `${title} — Atualizações` }, rejectClose: false,
      content: `<p>Versão instalada: <strong>${escape(version)}</strong>.</p>
        <p>${matches.length} playlists importadas reconhecidas; ${pending} ainda não sincronizadas com esta versão.</p>
        <p>“Verificar releases” consulta o GitHub. “Atualizar playlists” aplica o compêndio já instalado neste mundo.</p>`,
      buttons: [
        { action: 'check', label: 'Verificar releases', icon: 'fa-solid fa-cloud-arrow-down' },
        { action: 'sync', label: 'Atualizar playlists', icon: 'fa-solid fa-arrows-rotate' },
        { action: 'close', label: 'Fechar', default: true },
      ],
    });
    if (action === 'check') await checkForUpdates();
    if (action === 'sync') await synchronizeImported();
  } catch (error) { report(error); }
  finally { menuOpen = false; }
}

export function registerSettings() {
  game.settings.register(MODULE_ID, 'checkOnStartup', { name: 'Verificar novas releases',
    hint: 'O MJ principal verifica o GitHub ao entrar no mundo e a cada hora enquanto ele estiver aberto.',
    scope: 'world', config: true, type: Boolean, default: true, requiresReload: true });
  game.settings.register(MODULE_ID, 'autoSync', { name: 'Sincronizar playlists automaticamente ao entrar',
    hint: 'Depois de instalar uma nova versão do módulo, atualiza as playlists importadas sem confirmação. Playlists ativas são ignoradas.',
    scope: 'world', config: true, type: Boolean, default: false });
  for (const key of ['lastRemoteNotice', 'lastSyncPrompt']) {
    game.settings.register(MODULE_ID, key, { scope: key === 'lastSyncPrompt' ? 'world' : 'client', config: false, type: String, default: '' });
  }
  class UpdateMenu extends foundry.applications.api.ApplicationV2 {
    render() { void openUpdateMenu(); return this; }
  }
  game.settings.registerMenu(MODULE_ID, 'updates', { name: 'Atualizações da biblioteca',
    label: 'Verificar atualizações / Atualizar playlists', icon: 'fa-solid fa-arrows-rotate',
    hint: 'Consulta releases e sincroniza as playlists desta biblioteca já importadas no mundo.',
    type: UpdateMenu, restricted: true });
}

export async function onReady() {
  if (!isPrimaryGM()) return;
  const module = game.modules.get(MODULE_ID);
  module.api = { checkForUpdates, synchronizeImported, openUpdateMenu };
  try {
    const version = installedVersion();
    const { matches } = await getImportState();
    const pending = matches.filter(({ world }) => world.flags?.[MODULE_ID]?.syncedVersion !== version);
    if (pending.length) {
      if (game.settings.get(MODULE_ID, 'autoSync')) await synchronizeImported({ confirm: false });
      else if (game.settings.get(MODULE_ID, 'lastSyncPrompt') !== version) {
        await synchronizeImported();
        await game.settings.set(MODULE_ID, 'lastSyncPrompt', version);
      }
    }
  } catch (error) { report(error); }
  if (game.settings.get(MODULE_ID, 'checkOnStartup')) {
    void checkForUpdates({ silent: true });
    setInterval(() => {
      if (isPrimaryGM()) void checkForUpdates({ silent: true });
    }, 60 * 60 * 1000);
  }
}

Hooks.once('init', registerSettings);
Hooks.once('ready', onReady);
