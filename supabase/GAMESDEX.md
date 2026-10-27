# Livingdex por conjunto e disponibilidade

A alteração de agrupamento usa a mesma `migrations/202610280006_gamesdex_bulk_edit.sql`, já preparada, sem criar uma migração adicional. Enquanto essa migração não for aplicada, os endpoints da Livingdex e de remoções em lote não estarão disponíveis no Supabase; os dados não são simulados localmente.

## Conjuntos

O catálogo possui 22 conjuntos de jogos e cinco cards independentes de DLC. Os pares de versões compartilham progresso dentro de cada card.

## DLCs separadas

- Sword/Shield: jogo base, The Isle of Armor e The Crown Tundra.
- Scarlet/Violet: jogo base, The Teal Mask e The Indigo Disk.
- Legends: Z-A: jogo base e Mega Dimension.

Cada card possui sua própria chave, lista, progresso, edição em lote e medalha. A mesma espécie pode aparecer em mais de uma coleção; alterações posteriores são independentes. Os ícones das versões são mantidos nos cards das expansões.

As listas regionais são filtradas pela disponibilidade normal do snapshot acima. Os extras consideram o Slowpoke disponível em Wedgehurst, Quagsire e Perrserker do jogo base de Scarlet/Violet, os iniciais de Alola de Isle of Armor, Dynamax Adventures (com criação/evolução) e os lendários de Crown Tundra, além dos encontros/presentes extras de Indigo Disk. Não são incluídos eventos nem transferências.

- Dynamax Adventures: https://www.serebii.net/swordshield/dynamaxadventurespokemon.shtml
- Presentes e recompensas de Diglett: https://www.serebii.net/swordshield/diglett.shtml
- Snacksworth: https://www.serebii.net/scarletviolet/snacksworthlegendary.shtml

Execute `migrations/202610280007_livingdex_dlcs.sql` depois da 006 para redistribuir as marcações anteriores. A 007 copia as capturas para as DLCs correspondentes, remove do jogo base as espécies fora de sua lista e mantém uma cópia privada em `pokeatlas_private.livingdex_split_backups`. A migração não foi executada automaticamente. Reexecutá-la não repõe marcações de uma conta/conjunto já migrado.

Uma captura pertence ao conjunto, não a uma versão individual. Red e Blue compartilham progresso e medalha; Yellow permanece separado. O mesmo vale para Ruby/Sapphire e Emerald. A coleção usa a união das espécies obtidas normalmente em qualquer versão do conjunto. Exclusivos das duas versões contam; não são exigidos Pokémon que só poderiam vir de outro conjunto por transferência ou de eventos.

## Regra de obtenção

Conforme a escolha do usuário: captura, presentes permanentes, ovos, evolução e trocas/evoluções normais realizadas dentro do conjunto. Não incluir eventos nem transferências. As listas incluem pós-jogo e expansões quando houver uma rota normal. Não equivalem à lista completa impressa na Pokédex e não excluem todos os míticos por categoria: alguns possuem obtenção normal em jogos específicos.

O filtro usa `obtainableIn` do PokéPC Dataset, unindo as versões do conjunto e as formas ordinárias da mesma espécie. Não usa `eventOnlyIn`, `transferOnlyIn` ou mera capacidade de armazenamento. Mega, Gmax, Primal e formas exclusivamente de batalha não geram espécies extras. Este é um tracker por espécie, não uma coleção separada de formas.

- Fonte: https://github.com/pokepc/dataset
- Snapshot fixo: `3933759f494216d65bd19fcf52375c67bbe3e2cc`
- Referência dos campos: https://github.com/pokepc/dataset/blob/3933759f494216d65bd19fcf52375c67bbe3e2cc/backlog/docs/reference/doc-7%20-%20Pok%C3%A9mon-availability-fields.md
- Licença MIT preservada em `src/features/tracker/gameAvailability/LICENSE.txt`.
- Nomes, números regionais e composição das Pokédex: https://pokeapi.co/docs/v2#pokedexes

Champions não é apresentado como captura normal: a fonte separa seus recrutas não exportáveis da obtenção normal usada neste catálogo. Não foi inventada uma lista substituta. Serviços de armazenamento e versões japonesas isoladas também não aparecem como novos conjuntos.

## Boxes e medalhas

Cada conjunto abre primeiro **Todos os obteníveis**, incluindo as espécies de pós-jogo que não constam na Pokédex regional. As outras opções mantêm a numeração regional e filtram as espécies pela mesma regra de obtenção normal. Todas as boxes ficam em rolagem contínua de 30 entradas; os cartões visíveis são virtualizados.

O total exigido na medalha é a quantidade de espécies obtidas normalmente no conjunto, sem duplicar a mesma espécie entre Pokédex. Exemplos deste snapshot: Red/Blue 150; Yellow 137; Ruby/Sapphire 200; Emerald 237. As medalhas são compartilhadas entre as versões do mesmo conjunto e aparecem no perfil público.

## Salvamento e edição em lote

`game_key` continua sendo texto, mas passa a identificar o conjunto: `red-blue`, `ruby-sapphire` etc. Não foi criada outra tabela nem exigido outro formato de RPC para o agrupamento. A query 006 ainda é a responsável pela persistência por conta, e não foi executada automaticamente.

O bulk edit começa com as capturas já marcadas. Marcar inclui; desmarcar remove. **Salvar alterações** envia somente as inclusões e remoções pendentes em uma transação. É possível desmarcar tudo e salvar. Capturas de outras boxes, dex, conjuntos e usuários são preservadas. Cancelar não grava; Reverter alterações restaura o rascunho inicial; falhas preservam o rascunho.
