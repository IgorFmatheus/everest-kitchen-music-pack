export const MODULE_ID = 'everest-kitchen-music-pack';
export const PACK_ID = `${MODULE_ID}.musicas`;
const prefix = `modules/${MODULE_ID}/audio/`;

export function canonicalPath(value = '') {
  try { return decodeURIComponent(value).replaceAll('\\', '/'); }
  catch { return value.replaceAll('\\', '/'); }
}

export function findSourcePlaylist(world, sources) {
  const byId = new Map(sources.map(source => [source._id, source]));
  const managed = world.flags?.[MODULE_ID]?.sourcePlaylistId;
  if (managed) return byId.get(managed) ?? null;
  const uuid = world._stats?.compendiumSource ?? world.flags?.core?.sourceId;
  if (typeof uuid === 'string') {
    for (const sourcePrefix of [`Compendium.${PACK_ID}.Playlist.`, `Compendium.${PACK_ID}.`]) {
      if (uuid.startsWith(sourcePrefix)) return byId.get(uuid.slice(sourcePrefix.length)) ?? null;
    }
  }
  // Compatibilidade com importações v1.0 sem proveniência: exige nome e arquivos da biblioteca.
  const paths = new Set((world.sounds ?? []).map(sound => canonicalPath(sound.path)).filter(p => p.startsWith(prefix)));
  if (!paths.size) return null;
  const candidates = sources.filter(source => (source.name === world.name || source._id === world._id)
    && source.sounds.some(sound => paths.has(canonicalPath(sound.path))));
  return candidates.length === 1 ? candidates[0] : null;
}

export function isPlaybackActive(world) {
  return Boolean(world.playing || (world.sounds ?? []).some(sound => sound.playing || sound.pausedTime > 0));
}

export function planPlaylistSync(world, source, version) {
  const plan = { worldId: world._id, sourceId: source._id, name: world.name,
    skipped: isPlaybackActive(world), create: [], update: [], delete: [],
    playlistUpdate: {
      [`flags.${MODULE_ID}.sourcePlaylistId`]: source._id,
      [`flags.${MODULE_ID}.group`]: source.flags?.[MODULE_ID]?.group ?? '',
      [`flags.${MODULE_ID}.syncedVersion`]: version,
    } };
  if (plan.skipped) return plan;
  const current = world.sounds ?? [];
  const used = new Set();
  const sourceIds = new Set(source.sounds.map(sound => sound._id));
  for (const sound of source.sounds) {
    const candidates = current.filter(local => !used.has(local._id));
    const local = candidates.find(s => s.flags?.[MODULE_ID]?.sourceSoundId === sound._id)
      ?? candidates.find(s => s._id === sound._id && canonicalPath(s.path).startsWith(prefix))
      ?? candidates.find(s => !s.flags?.[MODULE_ID]?.sourceSoundId && canonicalPath(s.path) === canonicalPath(sound.path));
    if (!local) {
      const { _id, _key, ...data } = structuredClone(sound);
      data.flags ??= {};
      data.flags[MODULE_ID] = { ...(data.flags[MODULE_ID] ?? {}), sourceSoundId: sound._id, sourceName: sound.name };
      data.playing = false;
      data.pausedTime = 0;
      plan.create.push(data);
      continue;
    }
    used.add(local._id);
    const patch = { _id: local._id };
    if (local.path !== sound.path) patch.path = sound.path;
    const previous = local.flags?.[MODULE_ID] ?? {};
    // Atualiza o título de origem apenas quando ele não foi personalizado pelo MJ.
    if (previous.sourceName && local.name === previous.sourceName && local.name !== sound.name) patch.name = sound.name;
    if (previous.sourceSoundId !== sound._id) patch[`flags.${MODULE_ID}.sourceSoundId`] = sound._id;
    if (previous.sourceName !== sound.name) patch[`flags.${MODULE_ID}.sourceName`] = sound.name;
    if (Object.keys(patch).length > 1) plan.update.push(patch);
  }
  for (const local of current) {
    const sourceId = local.flags?.[MODULE_ID]?.sourceSoundId;
    // Remove somente faixas identificadas como gerenciadas; faixas locais e legadas sem vínculo ficam intactas.
    if (sourceId && !sourceIds.has(sourceId)) plan.delete.push(local._id);
  }
  return plan;
}

export function summarizePlans(plans) {
  const eligible = plans.filter(plan => !plan.skipped);
  return { playlists: eligible.length, skipped: plans.length - eligible.length,
    create: eligible.reduce((n, p) => n + p.create.length, 0),
    update: eligible.reduce((n, p) => n + p.update.length, 0),
    delete: eligible.reduce((n, p) => n + p.delete.length, 0) };
}
