# Minha box — importação de saves

A página `/my-box` lê equipe e boxes com PKHeX.Core 26.10.18 e guarda cada Pokémon individualmente na conta do treinador. Pokémon iguais em slots diferentes são preservados. A coleção é privada: não é exposta no perfil público e não altera o Dex Tracker.

## Ativação no Supabase

Execute **`supabase/migrations/202610310001_save_boxes.sql`** no SQL Editor do projeto, após a migração de contas `202610280001_accounts.sql`.

Esta alteração foi testada em um PostgreSQL descartável. **A migração não foi executada no seu Supabase remoto.** A interface exibirá erro de disponibilidade enquanto as funções não existirem. Nunca coloque uma chave `service_role` no site; esta implementação usa a sessão da conta e a sessão anônima autenticada já existentes no app.

## Leitor local

Instale o SDK .NET 10 e execute na raiz do projeto:

```powershell
dotnet run --project services/SaveReader --urls http://localhost:5099
```

O site em `http://localhost:8081` usa esse endereço automaticamente. A saúde do leitor é consultável em `http://localhost:5099/health`. Não é necessário enviar a sessão da conta nem credenciais do Supabase para o leitor.

## Publicação

O leitor é um serviço ASP.NET separado; ele não roda dentro de uma Supabase Edge Function. Há um Dockerfile em `services/SaveReader` para hospedar em um ambiente com containers/.NET.

```powershell
docker build -t pokeatlas-save-reader services/SaveReader
docker run --rm -p 5099:8080 -e AllowedOrigins=https://seu-site.example pokeatlas-save-reader
```

Configure no ambiente do leitor `AllowedOrigins` com os domínios exatos do site separados por vírgula. No site, defina `EXPO_PUBLIC_SAVE_READER_URL=https://seu-leitor.example` e reinicie/recompile o Expo. Utilize HTTPS fora do localhost, inclusive ao acessar pelo navegador do celular. O `localhost` do celular não é o computador: para uso entre dispositivos, publique o leitor em HTTPS e configure o endereço público.

O leitor limita uploads a 64 MiB, aplica limite de requisições por IP e processa no máximo duas importações ao mesmo tempo por instância. Em produção, ajuste os limites e o timeout do proxy para este tamanho. Não habilite registro de corpos de upload nem cache das respostas. O CORS permite apenas as origens configuradas; não substitui controle de tráfego no provedor.

## Uso

1. Entre na sua conta e abra **Minha box**.
2. Escolha o save exportado/descriptografado do jogo. Arquivos sem extensão, como `main`, também são aceitos pelo seletor.
3. Toque em **Ler save**. O arquivo será enviado ao seu leitor, processado em memória e descartado após a requisição.
4. Confira a prévia e confirme **Guardar na minha box**. Só então os registros são gravados no Supabase.
5. Para atualizar a mesma importação, selecione o save e toque em **Atualizar save selecionado**. A confirmação substitui apenas aquele snapshot. O jogo/treinador precisa corresponder.

Uma cópia byte a byte idêntica retorna a importação existente; arquivos diferentes importados como novos saves permanecem separados. A identidade de uma importação não é uma prova de autenticidade do Pokémon.

## Dados e compatibilidade

São guardados jogo, treinador, hash do arquivo, nomes/quantidade de boxes, equipe, posições e dados individuais: espécie, forma, apelido, nível, gênero, shiny, ovo, natureza, habilidade, item, treinador original, identificadores, IVs, EVs, golpes e registro binário do Pokémon. O arquivo de save completo não é armazenado. Os registros binários e identificadores permanecem privados junto com o restante da coleção.

A leitura usa a detecção `SaveUtil.GetSaveFile` da versão fixada do PKHeX.Core, sem escolher manualmente um jogo. O suporte efetivo depende do reconhecimento e integridade do formato por essa versão. ROM hacks, fangames, saves criptografados, save states, arquivos compactados e contêineres que exigem seleção de jogo podem não ser reconhecidos. São importados equipe e slots de boxes convencionais expostos por `SaveFile`; depósitos especiais, daycare e áreas extras não são incluídos. Formatos sem boxes convencionais mostram um aviso. Sprites usam a espécie base; o número da forma original é preservado e mostrado nos detalhes.

A importação de arquivos está implementada para o **site**, inclusive no navegador mobile. No app nativo, a coleção pode ser consultada, mas a escolha de arquivo orienta usar o navegador. A leitura não altera o arquivo original e não realiza certificação de legalidade.

## Verificação

```powershell
node --test tests/save-boxes.test.cjs
dotnet run --project services/SaveReader.Tests
npm run build:web
```

Os testes do banco verificam isolamento entre contas/dispositivos, permissões, preservação de duplicados, idempotência, substituição explícita e rejeição atômica de posições inválidas. O teste do leitor cria um save sintético de Emerald sem dados pessoais, lê equipe/boxes e verifica os atributos. Isso não substitui testes com amostras de cada jogo e geração.

## Componente de terceiros

PKHeX.Core é de autoria dos contribuidores do [PKHeX](https://github.com/kwsch/PKHeX), distribuído sob **GPL-3.0-or-later**. Veja `services/SaveReader/THIRD_PARTY_NOTICES.md` e a licença do componente. Preserve os avisos e disponibilize o código-fonte correspondente conforme a licença ao distribuir o serviço. A adição deste componente não altera automaticamente a declaração de licença dos arquivos existentes do app.
