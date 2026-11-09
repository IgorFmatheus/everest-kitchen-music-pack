# Everest Kitchen Music Pack — Foundry VTT 13

Modelo de repositório para distribuir uma biblioteca de áudio como módulo, com um compêndio de playlists e releases automáticas. Ainda não contém músicas nem banco de dados de compêndio. A compatibilidade com V13 está declarada; a reprodução e a importação precisam ser verificadas no seu Foundry antes da primeira publicação.

## 1. Preparar o conteúdo na VPS

1. Na tela inicial do Foundry 13, use Add-on Modules → Create Module.
2. Use o identificador `everest-kitchen-music-pack`.
3. Adicione um Compendium Pack com Name `musicas`, Label `Everest Kitchen Music Pack` e Document Type `Playlist`.
4. Envie os áudios por SFTP para `Data/modules/everest-kitchen-music-pack/audio/`, organizados por tema. Prefira nomes sem acentos e espaços.
5. Ative o módulo em um mundo e crie as playlists com os arquivos dessa pasta. O caminho de cada faixa deve começar por `modules/everest-kitchen-music-pack/audio/`.
6. Para playlists existentes, ajuste as fontes das faixas para essa pasta antes de exportar. Mover arquivos não altera os caminhos antigos automaticamente.
7. Desbloqueie o compêndio, arraste as playlists para ele e bloqueie novamente.
8. Teste a importação em outro mundo e reproduza algumas faixas.
9. Pare o processo do servidor Foundry antes de copiar o banco. Copie `packs/musicas/` inteiro e `audio/` do módulo na VPS para as pastas correspondentes deste repositório. Preserve os arquivos internos do banco LevelDB; não os edite.

Use o `module.json` deste repositório para gerar as releases. O banco deve corresponder ao pack `musicas` e aos caminhos definidos nele. Não copie dados enquanto o servidor estiver escrevendo no banco.

## 2. Criar o repositório no GitHub

Crie um repositório público chamado `everest-kitchen-music-pack` e envie todos os arquivos deste modelo, incluindo `.github/workflows/release.yml`, junto com seus áudios e o compêndio. Pelo terminal autenticado, dentro desta pasta:

```powershell
git init
git add .
git commit -m "Adiciona biblioteca de músicas e automação de releases"
git branch -M main
gh repo create CONTA/everest-kitchen-music-pack --public --source=. --remote=origin --push
```

Substitua `CONTA` pelo usuário ou organização escolhidos. Se o repositório já existir, configure o remote e envie para ele em vez de usar `gh repo create`.

O instalador padrão do Foundry precisa acessar o manifesto e o ZIP sem login. Publicar neste repositório tornará os áudios enviados acessíveis publicamente; inclua conteúdo que você possa distribuir.

Arquivos individuais acima de 100 MiB precisam de Git LFS ou outra estratégia de armazenamento; configure isso antes do primeiro commit. O workflow baixa os objetos LFS para incluir os áudios reais no ZIP. Armazenamento e transferência do GitHub têm limites; para coleções grandes, avalie armazenar os áudios separadamente.

## 3. Publicar a primeira versão

Depois de enviar o conteúdo:

```powershell
git tag v1.0.0
git push origin v1.0.0
```

Na aba Actions, acompanhe `Publicar módulo Foundry`. O workflow valida a presença do banco e dos áudios, define a versão a partir da tag e cria uma release com dois anexos:

- `module.json`: manifesto de instalação e atualização;
- `everest-kitchen-music-pack.zip`: manifesto na raiz, compêndio e áudios.

A verificação de arquivos não inspeciona o conteúdo do LevelDB nem garante que todos os caminhos das playlists estejam corretos. Esse teste é feito no Foundry.

O manifesto fonte pode permanecer em `0.1.0`: o processo de release substitui a versão no manifesto publicado pela tag. Nenhuma credencial pessoal precisa ser incluída no repositório; o workflow usa o token temporário do GitHub Actions.

## 4. Instalar no Foundry

Em Add-on Modules → Install Module → Manifest URL, cole, substituindo CONTA:

```text
https://github.com/CONTA/everest-kitchen-music-pack/releases/latest/download/module.json
```

Ative o módulo em cada mundo e importe as playlists do compêndio. A instalação ocorre uma vez por servidor Foundry; a ativação é por mundo. Para instalar em outro servidor, use o mesmo link.

## 5. Atualizar

Edite sua biblioteca de origem, exporte as playlists novamente e, com o servidor parado, copie o banco e os áudios atualizados para o repositório. Envie um commit e uma nova tag, como `v1.0.1`.

Depois use a atualização de módulos do Foundry. Faça as edições em uma cópia de trabalho e guarde backup: instalar uma atualização pode substituir os arquivos do módulo. As playlists já importadas nos mundos são cópias e precisam ser atualizadas nesses mundos separadamente.

## Referências

- https://foundryvtt.com/article/module-development/
- https://foundryvtt.com/article/packaging-guide/
- https://foundryvtt.com/article/module-maker/
