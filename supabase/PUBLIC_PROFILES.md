# Perfis públicos

No SQL Editor, execute o arquivo inteiro `migrations/202610280005_public_profile.sql` depois das migrações de contas e de trackers (`202610280001_accounts.sql` e `202610280003_dex_tracker.sql`).

O perfil abre em `/{nickname}`, por exemplo `/Ash_01`, mesmo sem login. O nickname é consultado sem diferenciar maiúsculas de minúsculas. A foto usa a Pokébola padrão quando não existe ou não pode ser carregada. O painel mostra progresso e medalhas da Pokédex e Shinydex; Gamesdex e Megadex aparecem como "Em preparação" enquanto seus trackers não existem.

A função pública `pokeatlas_public_profile(p_nickname)` retorna somente nickname, avatar e contagens de cada tracker. Não retorna ID de conta, e-mail, senha, hashes, tokens, sessões nem listas individuais de capturas. As tabelas do schema `pokeatlas_private` continuam sem acesso direto para visitantes.

A conclusão é calculada sobre a quantidade de espécies nacionais da PokéAPI, com 100% apenas na coleção completa. As marcações, os nomes e as fotos vêm do Supabase; nenhuma informação de perfil é criada localmente para simular dados. A tela tem um botão para atualizar as contagens.

As configurações da conta incluem "Ver perfil público". Salvar uma foto ou atualizar o tracker invalida o cache do perfil público daquela conta.

Rotas existentes do aplicativo têm precedência. Para nicknames antigos iguais a uma rota reservada (por exemplo `profile` ou `login`), o link gerado usa `/u/{nickname}`, preservando o acesso às configurações e ao login.
