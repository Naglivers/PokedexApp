# Pokédex e Shinydex Tracker

No SQL Editor do mesmo projeto Supabase configurado em `.env.local`, execute o arquivo inteiro `migrations/202610280003_dex_tracker.sql` após a migração de contas `202610280001_accounts.sql`.

Para o botão **Completar Pokédex / Completar Shinydex**, execute depois `migrations/202610280004_complete_tracker.sql`. O botão marca todas as espécies em uma única transação da conta atual. A medalha aparece apenas quando todas as espécies da coleção estão salvas, e desaparece ao desmarcar qualquer uma. A medalha é calculada a partir das marcações e continua aparecendo ao reabrir o app; não depende de um valor local de conquista.

## Edição em lote

Na Pokédex, Shinydex e Livingdex, **Edição em lote** começa com as capturas atuais marcadas. Marque para capturado ou desmarque para não capturado; **Salvar alterações** envia inclusões e remoções em uma única transação. É possível desmarcar tudo e salvar. **Marcar todos**, **Desmarcar todos** e as ações por box alteram somente o rascunho. **Reverter alterações** restaura o estado inicial e **Cancelar** sai sem salvar. Em caso de falha, o rascunho é preservado. Esse fluxo exige a migração `202610280006_gamesdex_bulk_edit.sql`. Veja também `GAMESDEX.md`.

A coleção fica em `pokeatlas_private.tracker_marks`, com chave composta por `account_id`, `tracker_kind` (`pokedex` ou `shinydex`) e `pokemon_id`. Para conferir pelo SQL Editor:

```sql
select a.nickname, m.tracker_kind, m.pokemon_id, m.created_at
from pokeatlas_private.tracker_marks m
join pokeatlas_private.accounts a on a.id = m.account_id
order by a.nickname, m.tracker_kind, m.pokemon_id;
```

Os clientes não acessam a tabela diretamente. As funções `pokeatlas_tracker_get` e `pokeatlas_tracker_set` verificam o token da conta, sua validade e o dispositivo autenticado. Nunca recebem um ID de usuário fornecido pelo cliente. Uma chamada pode marcar/desmarcar até 30 Pokémon de forma atômica; chamadas repetidas não duplicam registros. Desmarcar apaga apenas as marcações da própria conta naquele tracker.

As boxes são formadas pela lista nacional de espécies da PokéAPI, ordenada por número. Cada box tem até 30 espécies em seis colunas e cinco linhas; a última box contém o restante. A Shinydex usa sprites shiny. As coleções são independentes de likes e favoritos, e entre si.

Todas as boxes ficam na mesma rolagem, sem paginação. A tela usa uma lista virtualizada: somente as boxes próximas da área visível mantêm cartões e sprites montados. Seleções e capturas ficam no estado da tela/cache da conta, de forma que sair da área visível não perde marcações. Boxes e cartões são memorizados separadamente para que selecionar um Pokémon não redesenhe toda a coleção.

A tela consulta a coleção salva ao abrir ou trocar de conta. As alterações são confirmadas visualmente depois de o servidor salvar. Falhas de conexão não marcam Pokémon como salvos. Não há importação automática de favoritos nem marcação offline.

Validação: `node --test tests/tracker.test.cjs` roda as migrações reais em PostgreSQL local (PGlite), incluindo isolamento entre contas/trackers/dispositivos, marcação individual, box inteira, remoção, repetição, sessão revogada e restauração da mesma conta em outro dispositivo.
