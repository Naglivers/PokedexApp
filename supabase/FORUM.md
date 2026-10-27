# Fórum e notícias da comunidade

Execute inteiro `migrations/202610280010_forum.sql` no SQL Editor após a migração de contas `202610280001_accounts.sql`. A conta `naglivers` precisa existir antes: a query para com erro se não encontrar essa conta. A query não foi aplicada automaticamente.

## Uso

- `/community` e `/forum`: abas Fórum, Notícias e Rankings, com pesquisa e paginação.
- `/forum/new`: criação de postagens para contas logadas. A conta administradora também pode selecionar Notícia Pokémon e informar a fonte.
- `/forum/{id}`: leitura pública da publicação e respostas; login necessário para responder.
- `/forum/{id}/admin`: painel sem link público. Entre com o nickname e a senha da conta administradora. Se ela já estiver logada, o painel abre diretamente.

O painel permite editar título/conteúdo/fonte, alternar post e notícia, fixar, ocultar/restaurar, fechar/reabrir respostas e moderar cada resposta. Não há exclusão definitiva. Notícias também podem ser importadas automaticamente: siga [AUTOMATIC_NEWS.md](AUTOMATIC_NEWS.md) e execute a migração 011.

## Permissões e armazenamento

Na primeira execução, a migração resolve o nickname `naglivers` para o UUID existente e o grava em `pokeatlas_private.forum_admins`. Nas próximas execuções, mantém o ID original. Não há concessão por nickname no cliente, login automático, senha embutida ou possibilidade de um usuário se promover pela API. A conta administradora usa chave estrangeira com exclusão restrita.

As tabelas `forum_posts`, `forum_comments`, `forum_admins` e `forum_audit` ficam no schema privado, com RLS e acesso direto revogado. Todas as alterações passam por RPCs que validam o token da conta e sua identidade de dispositivo com `session_account`. As funções administrativas também exigem que esse UUID esteja na tabela de administradores. A autorização não depende de a rota ser escondida.

Listagens públicas retornam somente posts e respostas publicados. Conteúdo oculto só é retornado pela função administrativa, depois da checagem de permissão. Perfis nas postagens expõem somente nickname e foto, sem senha, token, e-mail ou identificador interno da conta. O conteúdo é exibido como texto, sem executar HTML dos usuários.

Limites: título 4–140 caracteres, postagem 10–20.000, resposta 1–5.000, fonte HTTP/HTTPS opcional de até 2.048. Publicações: até 5 tentativas por 15 minutos por conta; respostas: até 20. A ordenação fixa posts destacados no topo; as listas usam páginas de 20.

Edições e moderação guardam o registro anterior em `forum_audit`, acessível somente no banco. Ocultar um post oculta também suas respostas da leitura pública, sem apagar registros. Reabrir/restaurar preserva o conteúdo. A chave pública do app não permite escrever diretamente nessas tabelas.

Após executar a query, abra Comunidade. Não foi realizado teste de execução contra seu Supabase.
