# Megadex Tracker

Execute `migrations/202610280009_megadex.sql` após as migrações 006 e 008. A query cria `pokeatlas_private.mega_tracker_marks`, as RPCs privadas de leitura/escrita e adiciona o progresso ao perfil e às coleções públicas. A query não foi executada automaticamente.

Cada marcação pertence à conta e ao ID da forma Mega. Charizard X/Y, formas Z, gêneros e variantes cosméticas cadastradas são entradas distintas; marcar uma não marca outra. O total deste snapshot é 97 formas, em boxes contínuas de até 30, ordenadas pelo número nacional da espécie. O `?` abre a página da forma; o sprite usa sua arte oficial.

Fonte: https://github.com/PokeAPI/pokeapi/blob/2bf639e5572812a67d2b94903fdcb9d095f5aeb2/data/v2/csv/pokemon.csv

Inclui somente identificadores com o sufixo `-mega` e suas variantes; Primal e Gmax ficam fora da Megadex. O catálogo inclui as formas disponibilizadas na PokéAPI para Legends: Z-A e Mega Dimension, sem inventar IDs. Novas formas requerem atualização do catálogo e da lista permitida na query.

Marcação individual, por box, completar tudo e edição em lote usam a mesma RPC transacional de inclusões e remoções. Cancelar não grava. Contas, trackers e capturas de jogos permanecem independentes. As tabelas privadas têm RLS e acesso direto revogado. Os endpoints públicos expõem apenas IDs de capturas e totais; não retornam e-mail, senha ou token.

A badge de Megadex é calculada a partir da conclusão atual, como as outras badges: aparece ao atingir 100% e deixa de estar conquistada se uma forma for desmarcada.
