# Contas e configurações do usuário

O login usa apenas nickname e senha. E-mail e foto são opcionais e não são usados para autenticar.
O nickname diferencia maiúsculas/minúsculas na exibição, mas não no login.

## Ativar no Supabase

1. No SQL Editor do mesmo projeto configurado em `.env.local`, execute TODO o arquivo `migrations/202610280001_accounts.sql`.
2. Mantenha **Authentication → Sign In / Providers → Anonymous Sign-Ins** habilitado. Essa identidade técnica protege o acesso às funções; o usuário continua entrando só com nickname e senha.
3. Rode `npm.cmd run supabase:check`. As linhas de comunidade e contas/perfis devem aparecer como disponíveis.
4. Reinicie o Expo com `npx.cmd expo start --lan --clear` e recarregue o aplicativo.

A migração pode ser executada novamente. Ela não apaga contas, nem usa a tabela `public.pokeatlas_profiles` da query anterior. Os dados desta implementação ficam no esquema privado `pokeatlas_private`.

## Como funciona

- Deslogado: o cabeçalho mostra **Login** e a Pokébola padrão.
- Logado: mostra nickname e foto; tocar abre `/profile`.
- Na configuração é possível salvar/remover e-mail e foto, ou sair da conta.
- Fotos são reduzidas para 512px e salvas como imagens pequenas privadas no próprio banco, junto ao perfil. Não é necessário criar bucket público.
- O perfil atualizado passa para o cabeçalho e para o cache depois de salvar.
- A sessão dura até 30 dias e é restaurada ao abrir o app. No celular o token fica no SecureStore; o perfil fica no AsyncStorage. No navegador, o armazenamento é local ao navegador. Nenhuma senha é guardada no cache.
- Com a sessão em cache, a interface abre mesmo offline. A sincronização e as alterações precisam de conexão. Sessões revogadas/expiradas são recusadas pelo servidor.
- Uma conta pode entrar em outro aparelho com o mesmo nickname e senha. O e-mail não é verificado e não há recuperação de senha por e-mail nesta versão.
- Contas da versão antiga eram só locais. Cadastre o nickname uma vez para criar a conta no servidor; o formulário reaproveita o nickname salvo. O hash local antigo só é removido depois de um login/cadastro online bem-sucedido.
- Favoritos/equipes continuam locais; curtidas e visitas da comunidade ainda pertencem à identidade técnica do dispositivo.

## Proteção

As tabelas não têm leitura nem escrita liberadas à chave pública. As funções verificam uma sessão aleatória de 256 bits, expiração e identidade técnica do dispositivo. O banco armazena apenas SHA-256 do token e bcrypt com salt da senha. Login/cadastro têm limite de tentativas. A foto e o e-mail são acessíveis somente por uma sessão válida da conta. A senha aceita 6 ou mais caracteres e no máximo 72 bytes UTF-8.

Não coloque chaves `service_role`, senhas do banco ou tokens administrativos em variáveis `EXPO_PUBLIC_*`.

## Testes

`node --test tests/*.test.cjs` verifica, entre outros fluxos, cadastro sem e-mail, apelido ocupado, senha incorreta, login em outro dispositivo, privacidade do perfil, expiração/revogação, limite de tentativas e restauração do cache. O teste SQL roda a migração real em PostgreSQL local (PGlite + pgcrypto), sem tocar no projeto Supabase.
