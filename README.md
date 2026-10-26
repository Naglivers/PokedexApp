# Pokéatlas

Pokédex em React Native, Expo Router e TypeScript. A mesma interface se adapta a web, Android e iOS. Dados da [PokéAPI V2](https://pokeapi.co/docs/v2).

## Executar

Use Node 20 LTS e npm. Na primeira execução:

```sh
npm install
npm start
```

`npm start` inicia o Expo em modo web e abre o navegador. Utilize a URL que o terminal informar (no Metro, geralmente http://localhost:8081). Web e aplicativo nativo podem usar a mesma porta; o manifesto JSON não é a interface web. O projeto configura explicitamente Metro como bundler web.

```sh
npm run android
npm run ios
npx expo start
```

Android requer um emulador ou aparelho com build compatível. O simulador iOS requer macOS. Este projeto usa Expo SDK 51; uma versão atual do Expo Go pode exigir uma development build ou atualização de SDK. Não foi realizada execução em dispositivos físicos durante esta alteração.

Se outra instância estiver usando a porta, encerre-a ou use `npm start -- --port 8100`. Para reconstruir o cache: `npm start -- --clear`.

## O que está implementado

- Layout responsivo com navegação lateral no desktop e menu acessível no mobile.
- Home com Pokémon em destaque, sorteio, gerações, tipos e cards com dados reais.
- Pokédex com pesquisa global no índice de nomes/IDs (incluindo formas), paginação, combinação de filtros por tipo, tipo secundário, geração e favoritos; ordenação por número ou nome.
- Detalhes por Pokémon: consulta à espécie correta inclusive em formas alternativas, atributos, habilidades, descrições por jogo, defesas, evoluções ramificadas, golpes por método/jogo, encontros, galeria e variantes.
- Catálogos dinâmicos: golpes, habilidades, itens, frutas, tipos, gerações, jogos, regiões e demais recursos.
- API Explorer descobre endpoints no índice raiz da API, inclusive recursos sem nome. Consulta por ID/nome, paginação, JSON e dados estruturados com links navegáveis.
- Favoritos, equipe de até seis e comparação de até quatro, persistidos no dispositivo.
- Multiplicadores defensivos e cobertura ofensiva por tipos calculados pelo aplicativo, não simulação de batalha.

Os campos sem valores são mostrados como indisponíveis. Os textos da interface são em português; descrições oficiais usam inglês como fallback. Catálogos auxiliares usam visualização estruturada para disponibilizar todos os campos, sem inventar conteúdo. Filtros avançados de atributos, lendários e faixas de peso/altura não estão implementados.

## Arquitetura

Os ícones ficam em `assets/brand/`: a fonte vetorial `icon.svg`, o ícone 1024 px sem transparência para iOS/Android, o foreground transparente do ícone adaptativo Android e os favicons. Para regenerar os PNGs após alterar o desenho: `npm run icons`. Os ícones web são publicados também em `public/`; a configuração nativa fica em `app.json`.

- `app/`: rotas do Expo Router. Páginas `/`, `/pokedex`, `/pokemon/[id]`, `/catalog/[resource]`, `/catalog/[resource]/[id]`, `/api-explorer`, `/favorites`, `/compare`, `/team-builder`, `/search`.
- `src/components/`: layout, cards, componentes acessíveis, busca, seleção, erros, skeletons e visualização recursiva de recursos.
- `src/features/`: catálogos, detalhes Pokémon, evolução, comparação e equipes.
- `src/services/`: cliente Axios, tipos, consultas e QueryClient compartilhado.
- `src/store/`: Zustand com AsyncStorage para dados pessoais locais.
- `src/utils/`: pesquisa, localização, condições evolutivas e cálculo de efetividade.
- `src/theme/`, `src/constants/`: tokens visuais, cores e nomes de tipos.

TanStack Query mantém cache e deduplica consultas. A fila HTTP permite até seis chamadas simultâneas e aceita cancelamento. As imagens e os detalhes carregam apenas para registros visíveis da página. A pesquisa obtém índices leves de nomes/URLs e não baixa a base completa de detalhes da API. Informações secundárias carregam ao abrir a aba correspondente.

## Verificação

```sh
npm run typecheck
npm test
npm run build:web
```

Testes de domínio, persistência, limites de equipe/comparação, recursos sem nome, concorrência HTTP e cache usam o test runner do Node com transpile do TypeScript. Não substituem testes em dispositivos nativos.

Projeto de fãs, sem vínculo oficial com Nintendo, Game Freak ou The Pokémon Company. Pokémon e imagens pertencem a seus respectivos titulares.
