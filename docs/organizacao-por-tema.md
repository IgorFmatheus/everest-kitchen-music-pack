# Organização por tipo e tema

Músicas e Música Ambiente são as duas divisões principais. Somente Medieval possui subcategorias. A classificação original foi feita pelos títulos, sem análise auditiva.

| Playlist | Pasta | Faixas |
|---|---|---:|
| Música Ambiente / Ficção Científica | `audio/musica-ambiente/ficcao-cientifica/` | 2 |
| Música Ambiente / Medieval / Cidades e Vilas | `audio/musica-ambiente/medieval/cidades-vilas/` | 2 |
| Música Ambiente / Medieval / Florestas | `audio/musica-ambiente/medieval/florestas/` | 1 |
| Música Ambiente / Medieval / Laboratórios | `audio/musica-ambiente/medieval/laboratorios/` | 1 |
| Música Ambiente / Medieval / Magia e Planos | `audio/musica-ambiente/medieval/magia-planos/` | 2 |
| Música Ambiente / Medieval / Masmorras | `audio/musica-ambiente/medieval/masmorras/` | 1 |
| Música Ambiente / Medieval / Templos | `audio/musica-ambiente/medieval/templos/` | 1 |
| Música Ambiente / Steampunk | `audio/musica-ambiente/steampunk/` | 1 |
| Música Ambiente / Terror | `audio/musica-ambiente/terror/` | 1 |
| Músicas / Combate | `audio/musicas/combate/` | 1 |
| Músicas / Ficção Científica | `audio/musicas/ficcao-cientifica/` | 1 |
| Músicas / Medieval / Background | `audio/musicas/medieval/background/` | 2 |
| Músicas / Medieval / Combate | `audio/musicas/medieval/combate/` | 2 |
| Músicas / Medieval / Corte e Bailes | `audio/musicas/medieval/corte-bailes/` | 1 |
| Músicas / Medieval / Exploração | `audio/musicas/medieval/exploracao/` | 2 |
| Músicas / Medieval / Mistério | `audio/musicas/medieval/misterio/` | 2 |
| Músicas / Medieval / Tavernas | `audio/musicas/medieval/tavernas/` | 1 |
| Músicas / Medieval / Terror e Necromancia | `audio/musicas/medieval/terror-necromancia/` | 1 |
| Músicas / Suspense | `audio/musicas/suspense/` | 6 |
| Músicas / Terror | `audio/musicas/terror/` | 3 |
| Músicas / Urbano | `audio/musicas/urbano/` | 6 |

Estado atual: 21 playlists e 40 faixas presentes no disco. O catálogo mantém o histórico da organização inicial; a geração usa as pastas reais, incluindo novas faixas e ignorando as que foram removidas.

## Geração automática

Execute `npm run build:playlists` para gerar `packs/musicas/`. A release também executa essa geração automaticamente. Não é necessário criar playlists ou exportar um compêndio pelo Foundry.

Músicas usa reprodução sequencial; Música Ambiente usa soundboard e repetição por faixa. Todas começam paradas. O compêndio inclui pastas Músicas e Música Ambiente, com Medieval dentro de cada uma quando houver faixas.

Os caminhos são escapados para permitir espaços, acentos e # nos nomes. O banco gerado foi compilado e extraído novamente para conferir todos os caminhos e as faixas; reprodução precisa ser conferida no Foundry 13.
