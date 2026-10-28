# Badges do RetroAchievements

## Ativar

1. Execute a query migrations/202610280020_retroachievements_badges.sql no SQL Editor do Supabase, após 001, 015, 017 e 018.
2. Em Edge Functions → Secrets do Supabase, salve RETROACHIEVEMENTS_WEB_API_KEY com uma Web API Key do RetroAchievements. A chave é obtida nas configurações da sua conta RA. Ela fica somente no servidor, nunca em EXPO_PUBLIC, no app ou no GitHub.
3. Gere um segredo aleatório com pelo menos 32 caracteres. Salve o mesmo valor como RETROACHIEVEMENTS_SYNC_SECRET nos secrets do Supabase e do GitHub Actions.
4. Publique a função retroachievements-sync. Como o agendador usa autenticação própria, desative a verificação JWT do gateway para esta função. Ela valida a sessão Supabase e o token da conta nas chamadas do app, e o segredo do agendador nas chamadas em lote.
5. No GitHub Actions, mantenha SUPABASE_URL (ou EXPO_PUBLIC_SUPABASE_URL) configurado. Envie ao repositório o workflow .github/workflows/retroachievements-badges.yml, o script e os arquivos da integração.
6. No app: perfil → Códigos de amizade → salve o link HTTPS do seu perfil RetroAchievements. O painel mostra a sincronização e permite atualizar manualmente.

Publicação pela CLI já autenticada:

    npx.cmd supabase functions deploy retroachievements-sync --no-verify-jwt --project-ref SEU_PROJECT_REF

O código e a migração foram preparados localmente. A query ainda não foi aplicada, a função não foi publicada, os secrets não foram configurados e o workflow não foi enviado ou executado automaticamente.

Se já aplicou a query 020 anterior, execute também migrations/202610280021_retroachievements_hourly.sql para atualizar o cache para uma hora.

## Quando atualiza

- Ao abrir o próprio perfil, seus códigos ou uma página de jogo compatível estando conectado.
- A cada uma hora enquanto essas telas estiverem abertas.
- A cada hora, no minuto 19 pelo GitHub Actions, depois da publicação do workflow e configuração dos secrets.
- Pelo botão Sincronizar. Consultas bem-sucedidas são reutilizadas durante uma hora; tentativas com falha aguardam pelo menos dois minutos.
- Agendamentos do GitHub podem atrasar. Não há promessa de notificação instantânea no exato momento de desbloquear uma conquista.

Visitantes apenas consultam o último resultado salvo; não podem disparar consultas usando a chave privada.

## Regra da badge

A API GetUserCompletedGames fornece o resultado. Só aceitamos jogos com MaxPossible maior que zero e NumAwarded maior ou igual ao total. Não basta vencer a história. Softcore e Hardcore são aceitos; quando ambos estão completos, a badge é única e fica identificada como Hardcore.

As badges importadas aparecem sob o nickname e no grupo RetroAchievements da aba Badges. O título informa a origem e o modo. Além da badge própria do RA, 100% de qualquer uma das edições de uma dupla libera a badge de Pokédex/Livingdex daquele conjunto; jogos isolados liberam a badge do próprio jogo. O modo pode ser Softcore ou Hardcore. Esta é a regra de premiação do Pokéatlas. O vínculo com o conjunto fica salvo em ra_badges.game, e o perfil deriva a premiação desse registro, sem precisar remarcar nada. Não alteramos as marcações individuais de capturas, a Pokédex nacional, a Shinydex ou a Questline. Remover o vínculo ou perder o 100% em uma sincronização bem-sucedida retira a concessão importada; uma coleção concluída manualmente continua premiada.

O vínculo é o perfil público informado pelo usuário nos códigos de amizade, não uma comprovação de propriedade por OAuth. A API confirma as conquistas daquele perfil público.

## Jogos relacionados

Os conjuntos principais da série, de Red/Blue até Black 2/White 2, são reconhecidos por nomes exatos de edições e consoles Game Boy, Game Boy Color, Game Boy Advance e Nintendo DS. Inclui Yellow, Crystal, Emerald, Platinum e HeartGold/SoulSilver. Uma edição concluída concede sua própria badge; não exige concluir as duas edições de um par. Quando o RA compartilha o conjunto entre duas edições, concede uma badge para o conjunto compartilhado.

Hacks, subsets, desafios bônus, jogos sem conquistas e spin-offs não são importados nesta primeira integração. Novos jogos principais/consoles precisam de correspondências adicionadas à lista editions da função; não vinculamos jogos apenas por conter “Pokémon” no nome.

## Armazenamento e falhas

ra_sync e ra_badges ficam no esquema privado do Supabase com RLS e sem escrita direta do app. A finalização e as consultas em lote exigem service_role; o app só pode reservar sincronizações da própria conta. A API key não é retornada ou registrada nos logs.

Uma atualização bem-sucedida substitui as badges daquele vínculo conforme o resultado atual da API. Uma falha mantém os dados anteriores. Trocar ou remover o link faz o perfil deixar de exibir imediatamente as badges associadas ao link antigo. Respostas que chegam depois de uma alteração de vínculo são rejeitadas.

A importação é atômica e usa uma reserva por conta para evitar consultas simultâneas. O agendador processa três contas por lote.

Documentação oficial:
- https://api-docs.retroachievements.org/v1/get-user-completed-games.html
- https://api-docs.retroachievements.org/

Não foram executados testes, builds, consultas autenticadas ao RA ou gravações no banco real.


