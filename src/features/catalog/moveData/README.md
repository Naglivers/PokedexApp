# Índice de golpes

Fonte: https://github.com/PokeAPI/pokeapi/blob/2bf639e5572812a67d2b94903fdcb9d095f5aeb2/data/v2/csv/moves.csv

Tipos e categorias vêm de `types.csv` e `move_damage_classes.csv` no mesmo snapshot. O índice contém os 937 registros publicados nessa revisão, inclusive movimentos especiais e de jogos anteriores. Não é uma lista de disponibilidade por jogo.

Os arquivos JSON usam tuplas: ID, nome, ID do tipo, poder, precisão, PP, ID da categoria, prioridade e geração. Campos vazios de poder/precisão/PP permanecem `null`.

Os filtros são aplicados ao índice completo antes da paginação. Somente os detalhes das 18 entradas visíveis são consultados pela API. Descrições e demais relações vêm da PokéAPI; os atributos filtráveis dos cards seguem este mesmo snapshot, para corresponder aos resultados.

Sprites de TM: https://github.com/PokeAPI/sprites/tree/master/sprites/items
