# Everest Kitchen Music Pack — Foundry VTT 13

Biblioteca com **playlists e compêndio gerados automaticamente**, sem criar documentos manualmente no Foundry. A ferramenta oficial `@foundryvtt/foundryvtt-cli` compila as playlists em um banco LevelDB, incluído nas releases.

## Organização

```text
audio/
├── musicas/
│   ├── medieval/<subcategoria>/<faixa.mp3>
│   ├── urbano/<faixa.mp3>
│   └── ...
└── musica-ambiente/
    ├── medieval/<subcategoria>/<faixa.mp3>
    ├── ficcao-cientifica/<faixa.mp3>
    └── ...
```

Somente Medieval recebe uma subcategoria, como combate, exploração, cidades-vilas ou florestas. As demais categorias contêm os áudios diretamente. Cada pasta final com áudio gera uma playlist. Novas faixas entram automaticamente na próxima compilação; não é necessário atualizar o catálogo para gerar o compêndio.

- Músicas: canal `music`, reprodução sequencial e sem repetição individual por padrão.
- Música Ambiente: canal `environment`, modo soundboard para escolher a faixa individualmente e repetição ativada.
- As faixas começam paradas, com volume 0,5 e fade de 1 segundo. As opções podem ser alteradas após importar.
- O compêndio contém pastas Músicas e Música Ambiente, cada uma com a pasta Medieval quando houver faixas dessa categoria.
- IDs permanecem estáveis enquanto o caminho da faixa ou playlist não mudar. Cópias em arquivos diferentes são preservadas.

## Gerar localmente

Use Node.js 22.12 ou mais recente. No PowerShell:

```powershell
cd C:\Users\igorf\Repos\everest-kitchen-music-pack
npm ci
npm run build:playlists
npm test
```

O comando gera `packs/musicas/`. Essa pasta e `.generated/` são saídas ignoradas pelo Git, recriadas a partir dos áudios. Não coloque edições manuais em um compêndio gerado: a próxima compilação substitui seus documentos.

Para testar sem publicar, com o Foundry parado, copie `module.json`, `audio/` e `packs/` para `Data/modules/everest-kitchen-music-pack/` na VPS. Inicie o Foundry, ative o módulo e importe uma playlist do compêndio. Os testes automatizados verificam compilação e extração; reprodução e validação no aplicativo precisam ser conferidas no Foundry 13.

## Enviar ao GitHub

Repositório: https://github.com/IgorFmatheus/everest-kitchen-music-pack

Há áudios maiores que 100 MiB. Configure Git LFS antes de adicionar os arquivos ao Git. Os comandos pressupõem que os áudios ainda não foram incluídos em commits comuns, como na preparação inicial deste projeto:

```powershell
git lfs install --local
git lfs track "*.mp3"
git add .
git commit -m "Adiciona biblioteca e geração automática de playlists"
git push origin main
```

O manifesto e o ZIP precisam estar acessíveis sem login para instalação no Foundry. O repositório é público; publique somente áudios que você possa distribuir. Git LFS possui limites de armazenamento e transferência da conta. O workflow baixa os objetos LFS reais para incluir no ZIP.

## Publicar uma release

Depois do push para main:

```powershell
git tag v1.0.0
git push origin v1.0.0
```

Acompanhe **Actions → Publicar módulo Foundry**. O workflow instala as dependências fixadas, executa os testes, gera o compêndio, prepara o manifesto e publica:

- `module.json`: manifesto da versão;
- `everest-kitchen-music-pack.zip`: módulo completo com playlists prontas e áudios.

A versão publicada vem da tag. Em atualizações, use tags novas, como `v1.0.1`.

## Instalar no Foundry

Após a primeira release, em **Add-on Modules → Install Module → Manifest URL**, use:

```text
https://github.com/IgorFmatheus/everest-kitchen-music-pack/releases/latest/download/module.json
```

Ative o módulo em cada mundo. Abra o compêndio **Everest Kitchen Music Pack** e importe as playlists desejadas para a aba Playlists de áudio. Elas já incluem faixas, fontes e configurações. Não é necessário criar o compêndio ou montar as playlists no aplicativo.

## Avisos de atualização e sincronização das playlists

A partir da versão 1.1.0, o módulo reconhece as playlists importadas e oferece sincronização com a versão instalada. Importações da v1.0.0 são reconhecidas pela proveniência do compêndio; quando ela não existe, a identificação exige nome correspondente e arquivos desta biblioteca. Não altera playlists apenas porque possuem o mesmo nome.

1. **Nova release:** o MJ principal recebe um popup ao entrar no mundo ou na verificação feita a cada hora. Instale a nova versão pela tela inicial do Foundry, em Add-on Modules.
2. **Módulo atualizado:** ao voltar ao mundo, um popup oferece atualizar as playlists já importadas, sem importá-las outra vez.
3. **Verificação manual:** acesse Configurações do jogo → Configurar opções → Opções dos módulos → Everest Kitchen Music Pack → Verificar atualizações / Atualizar playlists. O menu permite consultar releases e sincronizar o compêndio instalado.
4. **Modo automático opcional:** ative “Sincronizar playlists automaticamente ao entrar”. Depois da atualização do módulo, o MJ principal sincroniza as playlists ao entrar no mundo, sem popup de confirmação. A opção vem desativada.

A sincronização adiciona faixas novas, atualiza as fontes e remove faixas gerenciadas que saíram da biblioteca. Preserva nomes personalizados, pastas, volume, repetição, canal, modo de reprodução e faixas locais. Faixas legadas sem vínculo de gerenciamento não são excluídas automaticamente. Playlists em reprodução ou pausadas são ignoradas; pare-as e use o botão manual para atualizar depois. Playlists de categorias ainda não importadas continuam disponíveis no compêndio e não são criadas automaticamente no mundo.

O módulo não instala arquivos enquanto o mundo está aberto. O aviso orienta a atualização no gerenciador do Foundry; a sincronização usa o compêndio da versão já instalada. Cada mundo mantém suas próprias playlists e precisa passar pela sincronização. Se dispensar o popup, o botão manual continua disponível.

## Referências

- [Organização por tipo e tema](docs/organizacao-por-tema.md)
- [Foundry CLI oficial](https://github.com/foundryvtt/foundryvtt-cli)
- [Empacotamento de módulos](https://foundryvtt.com/article/packaging-guide/)
