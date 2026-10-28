# Questline: checklist e insígnias

## Ativar no Supabase

Depois da query de contas 001, execute inteiros e nesta ordem:

1. migrations/202610280017_questline_checklist.sql
2. migrations/202610280018_questline_catalog.sql
3. migrations/202610280019_questline_badge_completion.sql (necessária também se 017/018 já foram aplicadas; reconhece conclusões anteriores)

A query 016 antiga não é necessária. Se já foi aplicada, seus objetivos pessoais permanecem preservados em game_quests, mas não contam para as novas insígnias.

## Funcionamento

Universo Pokémon → Jogos → Questline. Cada checklist tem história principal, pós-jogo e missões secundárias, busca, filtro de pendentes e paginação por categoria. É possível marcar e desmarcar individualmente. Visitantes podem consultar as etapas; apenas uma conta autenticada pode salvar.

O progresso pertence à conta e ao conjunto do jogo. Edições pareadas compartilham progresso. As expansões têm checklists próprias, acessíveis também pela página do jogo principal. Cada checklist pode ser aberta diretamente em /questline/{conjunto}.

A insígnia exige todos os objetivos de um catálogo não vazio, contendo as três categorias. É calculada pelo banco; criar objetivos pessoais não permite conquistá-la. Desmarcar uma etapa retira a conclusão. O perfil público mostra as insígnias de Questline separadas das badges de Livingdex.

## Cobertura atual e pendências

- Legends: Arceus: missões numeradas 1–27 e petições 1–122, incluindo Daybreak.
- Legends: Z-A: missões principais 1–42, secundárias 1–119 e EX1/EX2.
- Mega Dimension: missões dimensionais 1–14, secundárias 120–200 e EX3, separadas do jogo base.
- As entradas numeradas usam rótulos em português e o número exibido no jogo, com links para os guias. Ainda não incluem o nome e o roteiro detalhado de cada missão.
- Os outros 24 conjuntos têm uma lista inicial de marcos e tarefas, ainda incompleta e não revisada. O progresso pode ser salvo e a insígnia é concedida ao concluir todas as etapas atualmente disponíveis, mesmo enquanto a lista está em revisão. Não representam ainda todas as missões desses jogos.
- Petições e missões extras que exigem dados salvos ou presentes continuam na checklist. Confira as condições no guia antes de considerar a conclusão possível.

Fontes de numeração e escopo:
- https://www.serebii.net/legendsarceus/missions.shtml
- https://www.serebii.net/legendsarceus/requests.shtml
- https://www.serebii.net/legendsz-a/mainmissions.shtml
- https://www.serebii.net/legendsz-a/sidemissions.shtml
- https://www.serebii.net/legendsz-a/hyperspacemissions.shtml

## Dados

quest_games guarda os conjuntos e a indicação de catálogo revisado; quest_catalog guarda as etapas fixas; quest_progress guarda apenas as etapas concluídas por conta; quest_awards registra a data de conclusão. Todas ficam no esquema privado com RLS e acesso direto revogado.

pokeatlas_questline valida a sessão da conta e do dispositivo nas gravações e só aceita IDs cadastrados para aquele jogo. A leitura sem token retorna a lista sem progresso pessoal. pokeatlas_public_quest_badges expõe somente resumos e insígnias por nickname, sem tokens, e-mail ou IDs de conta.

O catálogo-fonte é supabase/questline-catalog.json. Após editar, gere novamente a query 018 com node scripts/generate-questline-catalog.cjs. IDs existentes são permanentes; não renumere tarefas para mudar seus títulos. Adicionar missões pode retirar uma conclusão antiga até que as novas etapas sejam concluídas. A geração não remove progresso.

Não foram executados testes, builds ou consultas ao banco real. As queries ainda precisam ser aplicadas.


