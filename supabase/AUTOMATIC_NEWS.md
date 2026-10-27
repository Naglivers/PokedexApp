# Notícias automáticas

1. No SQL Editor do Supabase, execute a migração `202610280011_automatic_news.sql` inteira, depois da `202610280010_forum.sql`. A conta administradora precisa existir.
2. O resultado final mostra `SUPABASE_NEWS_IMPORT_TOKEN` uma única vez. Copie o valor para um secret com esse nome em https://github.com/Naglivers/PokedexApp/settings/secrets/actions.
3. Configure também `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` (ou os equivalentes com prefixo `EXPO_PUBLIC_`). São os mesmos secrets usados pela rotina de manter o banco ativo. Use a chave pública, sem senha de usuário ou service_role.
4. No GitHub, abra Actions → Pokemon news → Run workflow. Depois, a rotina roda a cada hora, no minuto 37; o GitHub pode atrasar execuções.

Fonte: RSS https://www.nintendolife.com/feeds/news. O Nintendo Life indica o uso do RSS para links às notícias em https://www.nintendolife.com/contact.

Importa notícias cujo título menciona Pokémon, Pokédex, Pokopia ou TCG Pocket. Publica título, trecho curto do RSS (até 180 caracteres e 25 palavras) e link original, no idioma da fonte. Não copia a matéria completa nem imagens. A janela é de sete dias, limitada aos artigos disponíveis no feed.

O endereço original identifica a notícia. Execuções posteriores não duplicam nem sobrescrevem o post, mesmo se você o editar ou ocultar. A moderação continua em `/forum/{id}/admin`. A interface identifica publicações automáticas e sua fonte.

Para pausar, desative o workflow no GitHub ou execute como proprietário no SQL Editor:

```sql
update pokeatlas_private.forum_news_settings
set enabled = false where slot = 1;
```

A chave é armazenada somente como hash no banco e como secret no GitHub. Reexecutar a migração não revela nem substitui a chave existente. Para trocar uma chave perdida, gere outra no SQL Editor, atualize o hash e substitua o secret do GitHub.

O agendamento depende do GitHub Actions e da disponibilidade da fonte. Repositórios públicos podem ter agendamentos desativados após inatividade. A query não foi aplicada automaticamente e o importador não foi executado contra seu banco.
