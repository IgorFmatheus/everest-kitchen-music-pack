import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generatePlaylists } from './generate-playlists.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = process.env.GITHUB_REPOSITORY;
const tag = process.env.RELEASE_TAG;
if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '')) {
  throw new Error('Defina GITHUB_REPOSITORY como CONTA/REPOSITORIO.');
}
if (!/^v\d+\.\d+\.\d+$/.test(tag ?? '')) {
  throw new Error('A tag deve ter o formato v1.0.0.');
}

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'module.json'), 'utf8'));
if (manifest.id !== 'everest-kitchen-music-pack') throw new Error('O ID deve ser everest-kitchen-music-pack.');
if (manifest.packs?.length !== 1 || manifest.packs[0].name !== 'musicas'
    || manifest.packs[0].path !== 'packs/musicas' || manifest.packs[0].type !== 'Playlist') {
  throw new Error('Mantenha o compêndio Playlist musicas em packs/musicas.');
}

function collect(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Link simbólico não permitido: ${filename}`);
    return entry.isDirectory() ? collect(filename) : [filename];
  });
}

const pack = path.join(root, 'packs/musicas');
const audioFiles = collect(path.join(root, 'audio')).filter(file => /\.(mp3|ogg|opus|wav|flac|webm)$/i.test(file));
if (!audioFiles.length) throw new Error('Adicione suas músicas à pasta audio antes de publicar.');
for (const file of collect(path.join(root, 'audio'))) {
  const fd = fs.openSync(file, 'r');
  const prefix = Buffer.alloc(128);
  let size;
  try { size = fs.readSync(fd, prefix, 0, prefix.length, 0); }
  finally { fs.closeSync(fd); }
  if (prefix.subarray(0, size).toString().startsWith('version https://git-lfs.github.com/spec/v1')) {
    throw new Error(`Arquivo Git LFS não baixado: ${file}`);
  }
}

const url = `https://github.com/${repository}`;
manifest.version = tag.slice(1);
manifest.url = url;
manifest.manifest = `${url}/releases/latest/download/module.json`;
manifest.download = `${url}/releases/download/${tag}/everest-kitchen-music-pack.zip`;

const dist = path.join(root, 'dist');
if (fs.existsSync(dist)) throw new Error('A pasta dist já existe. Use uma cópia limpa para gerar a release.');
await generatePlaylists(root);
const content = [...collect(pack), ...collect(path.join(root, 'audio'))];
const stage = path.join(dist, 'package');
fs.mkdirSync(stage, { recursive: true });
for (const file of content) {
  if (/^(LOCK|LOG|LOG\.old.*|\.gitkeep|\.DS_Store|Thumbs\.db)$/.test(path.basename(file))) continue;
  const destination = path.join(stage, path.relative(root, file));
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(file, destination);
}
const json = JSON.stringify(manifest, null, 2) + '\n';
fs.writeFileSync(path.join(stage, 'module.json'), json);
fs.writeFileSync(path.join(dist, 'module.json'), json);
fs.copyFileSync(path.join(root, 'README.md'), path.join(stage, 'README.md'));
console.log(`Pacote preparado: ${repository} ${tag} (${audioFiles.length} arquivos de áudio).`);
