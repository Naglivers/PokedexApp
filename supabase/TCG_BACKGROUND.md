# Fundo da carta

## Ativar

1. Execute inteiro `migrations/202610280014_tcg_background.sql` no SQL Editor, após 001 (contas) e 010 (administrador).
2. No Supabase, abra Edge Functions → Secrets e adicione `GEMINI_API_KEY`, criada no Google AI Studio: https://aistudio.google.com/apikey. Não coloque essa chave em EXPO_PUBLIC nem no app.
3. Crie uma Edge Function chamada `tcg-background`, copie o conteúdo de `functions/tcg-background/index.ts` e publique. Mantenha a verificação JWT habilitada. As variáveis SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY são fornecidas pelo ambiente das Edge Functions.
4. Opcional: configure `GEMINI_VISION_MODEL` com um modelo Gemini que aceite imagens e saída JSON. O padrão é `gemini-3.8-flash`; confirme que ele está disponível na sua conta.
5. No app, entre na conta administradora, amplie uma carta e toque em Analisar fundo da carta.

Alternativa pela CLI já autenticada:

```powershell
npx.cmd supabase functions deploy tcg-background --project-ref SEU_PROJECT_REF
```

A API de IA pode ter cobrança conforme a conta. Não foi executada nenhuma análise durante a implementação. Cada projeto tem limite de 20 reservas de análise por dia, incluindo tentativas que falhem; resultados concluídos são reutilizados. Não há varredura automática de todas as cartas nem cobrança ao navegar.

## Funcionamento

A seção Fundo da carta aparece nos detalhes de qualquer carta, inclusive no catálogo geral. Ela mostra os Pokémon secundários identificados, com links para suas páginas. Na aba de cartas de cada Pokémon há outra seção Fundo da carta: ela reúne cartas já analisadas em que aquela espécie aparece na arte sem ser a principal.

Só o administrador pode iniciar análises e corrigir identificações. Visitantes apenas leem resultados salvos. Não há identificação inventada nem correspondência por habitat: é necessário examinar uma imagem real. Se a fonte estiver sem imagem, a análise informa isso.

A imagem vem exclusivamente do endereço oficial retornado pelo TCGdex. Não são aceitas URLs fornecidas pelo usuário. A IA recebe somente a imagem pública e os números das espécies principais, nunca senhas, e-mail ou tokens. Os números/nome das espécies são conferidos com a PokéAPI e resultados com confiança informada abaixo de 0,9 são descartados. Isso reduz erros, mas não garante acerto: o resultado continua identificado como IA até revisão administrativa.

Pokémon principais são excluídos. Instrutores e outras cartas podem ter participações, mesmo sem um Pokémon principal. A seção inversa respeita os idiomas permitidos pelo app. Ela não é um catálogo completo de participações: cresce conforme as cartas são analisadas.

Correção manual: entre em Corrigir identificação e informe os números nacionais separados por vírgula. Deixe vazio para remover identificações incorretas. A correção não executa a IA novamente e não consome nova análise.

## Armazenamento

`pokeatlas_private.tcg_background` guarda metadados públicos da carta, espécies principais, espécies do fundo, estado da análise, modelo e revisão. A chave de API fica apenas nos Secrets do servidor. RLS bloqueia acesso direto. A escrita final pela função de IA exige service_role; a correção exige sessão do administrador vinculada ao dispositivo. Reservas impedem chamadas simultâneas para a mesma carta.

Documentação do reconhecimento: https://ai.google.dev/gemini-api/docs/image-understanding.

Não foram aplicadas queries, publicada a função ou executados testes automaticamente.
