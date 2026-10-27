# Ativação da comunidade

Para login com nickname/senha, perfil, e-mail opcional e foto, siga [Contas e configurações](ACCOUNTS.md) e execute a migração adicional de contas.

A chave publishable configura o cliente, mas não possui permissão para criar tabelas, executar SQL administrativo ou mudar opções do Auth. Não é necessária nenhuma chave secreta no aplicativo.

1. Abra o SQL Editor do projeto Supabase e execute todo o arquivo `migrations/202610260001_community.sql`.
2. Em **Authentication → Sign In / Providers**, habilite **Anonymous Sign-Ins**. Dependendo da versão do painel, a opção pode aparecer em **Providers → Anonymous**.
3. As variáveis reais estão em `.env.local` (ignorado pelo Git). Para outra instalação, copie `.env.example` para `.env.local` e preencha a URL e a chave publishable.
4. Execute `npm run supabase:check` e reinicie o Expo com `npm start -- --clear`.

## Funcionalidades

- O coração continua sendo favorito local. Curtir usa uma identidade anônima do Supabase Auth, persistida no navegador/app, e é independente dos favoritos.
- A rota `/community` mostra o ranking global de Pokémon curtidos e páginas visitadas.
- Uma curtida por Pokémon e por identidade; curtir/descurtir é idempotente.
- Uma visita por identidade/página/dia UTC. Não são armazenados os termos pesquisados, IP, e-mail ou outros dados fornecidos pelo app.
- A identidade anônima não equivale a uma pessoa verificada. Limpar o armazenamento, trocar de navegador ou de aparelho cria outra identidade. Sincronização entre aparelhos exigirá login de usuário, ainda não implementado.
- Equipes e favoritos continuam locais; esta integração não migra esses dados nem cria contas com e-mail.
- Sem configuração/schema, o app continua funcionando com a PokéAPI. Os botões de curtida ficam indisponíveis e a comunidade apresenta um estado de preparação, sem inventar contagens.

## Proteção dos dados

RLS está habilitada nas duas tabelas. Não há leitura pública de identidades ou eventos de acesso. Usuários autenticados podem ler somente suas próprias curtidas. Alterações passam por funções que verificam `auth.uid()`, e os agregados públicos não incluem identidades. Eventos individuais não podem ser escritos diretamente pelo cliente; a função de visitas controla a deduplicação no banco.

O script pode ser executado novamente; não apaga os registros existentes. Ele cria somente objetos com prefixo `pokeatlas_`.

## Verificação manual após ativar

1. Curtir um Pokémon e abrir `/community`: a contagem deve aumentar uma vez.
2. Recarregar: a curtida continua marcada. Descurtir remove a contribuição.
3. Visitar a mesma página várias vezes no mesmo dia: somente uma visita é registrada por identidade.
4. Abrir outro navegador: os totais globais são iguais, mas a identidade e as curtidas pessoais são independentes.
5. Testar a Data API com a chave pública: não deve ser possível ler eventos individuais nem alterar a curtida de outra identidade.
