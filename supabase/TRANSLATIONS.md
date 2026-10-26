# Traduções locais gratuitas do Pokéatlas

Esta versão não chama a função `translate` e não precisa de chave de tradução. O seletor ao lado dos favoritos oferece Português, English, Español, 日本語 e 简体中文, com preferência salva e opção Automático.

Os textos ficam em `src/i18n/catalog.ts`, as descrições locais revisadas em `src/i18n/apiCatalog.ts` e os nomes oficiais em `src/i18n/officialNames.json`. Para atualizar os nomes públicos da PokéAPI, rode `node scripts/sync-localized-names.cjs`.

Descrições da PokéAPI usam primeiro o idioma selecionado. Textos sem tradução oficial ou local continuam no idioma de origem; novos textos precisam ser adicionados ao catálogo. Não há tradução irrestrita de textos desconhecidos.

Reinicie com `npm start -- --clear` ao atualizar. A interface não precisa de rede para traduzir; os dados da PokéAPI continuam exigindo internet.

## Verificação

- Troque entre os cinco idiomas no botão de globo e recarregue: a preferência deve continuar salva.
- Escolha Automático para seguir as preferências do aparelho.
- Nenhuma requisição a `/functions/v1/translate` deve ser enviada.
- A API deve continuar recebendo os identificadores originais, mesmo quando os nomes exibidos mudam.

A antiga função no Supabase e suas tabelas não são usadas pelo app. Os dados de curtidas e visitas continuam funcionando normalmente.

Fonte dos nomes oficiais: https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv
