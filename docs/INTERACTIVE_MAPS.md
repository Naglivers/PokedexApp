# Mapas interativos

Acesse Universo Pokémon → Mapas interativos, ou a seção de mapa nas páginas de regiões e jogos.

- Zoom de 100% a 300%, rolagem e tela cheia.
- Pontos clicáveis ligados aos locais reais retornados pela PokéAPI.
- Kanto começa com onze centros de cidades conferidos na imagem RBY usada no app. Não são coordenadas geográficas e não representam todas as localizações.
- Todas as regiões têm navegação por lista pesquisável de locais. Escolha um local e use Posicionar no mapa para criar uma marcação; Ajustar ponto permite movê-la.
- Marcações personalizadas ficam no AsyncStorage deste aparelho, na chave pokeatlas-map-points-v1. Remover minha marcação restaura o ponto inicial, quando existe. Não há gravação no Supabase.
- Cada local mostra suas áreas e os encontros cadastrados. Filtros por jogo, método e Pokémon. Cada encontro informa níveis, chance e condições fornecidas pela fonte.
- Nas páginas de jogos, os encontros são limitados às edições desse jogo ou conjunto.

Não inventamos coordenadas para regiões não mapeadas: elas continuam navegáveis pela lista e podem receber marcações pessoais. As imagens atuais são mapas ilustrados de referência, não mapas exatos para todas as edições. Orre permanece sem imagem.

A cobertura de encontros varia na PokéAPI, especialmente em jogos recentes. Área sem registro não significa que não há Pokémon no jogo. Encontros só carregam ao selecionar um local; resultados são paginados e as consultas ficam em cache.

Fonte dos dados: https://pokeapi.co/docs/v2#locations. Fontes das imagens: assets/maps/SOURCES.md.

Nenhuma query nova é necessária. Não foram executados testes.
