# Rotina de atividade do Supabase

O workflow `.github/workflows/supabase-keep-alive.yml` agenda quatro consultas diárias (00:17, 06:17, 12:17 e 18:17 UTC) e permite execução manual em Actions > Supabase keep-alive > Run workflow.

A consulta POST à função `pokeatlas_like_counts` lê os totais de um Pokémon. Não altera curtidas, capturas, usuários ou outras linhas. A função existe desde a migração 001: não há uma nova query para executar. Um ping apenas no Auth não foi usado porque a rotina precisa acessar o Postgres.

## Configuração no GitHub

Em https://github.com/Naglivers/PokedexApp/settings/secrets/actions, crie dois repository secrets:

- `SUPABASE_URL`: o valor de `EXPO_PUBLIC_SUPABASE_URL` do seu `.env.local`.
- `SUPABASE_PUBLISHABLE_KEY`: o valor de `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` do seu `.env.local`.

Os nomes `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` também são aceitos como secrets alternativos. Não é necessário fornecer service_role, senha de banco, token da conta nem credenciais GitHub ao workflow.

O arquivo precisa estar na branch padrão (main) e GitHub Actions deve estar habilitado. Depois de cadastrar os secrets, use Run workflow para conferir o resultado. Credenciais e dados retornados não são impressos nos logs.

## Limitações

A rotina gera atividade leve e sinaliza falhas no GitHub Actions. Não garante disponibilidade permanente no plano gratuito: o Supabase avalia atividade suficiente ao longo de sete dias e pode pausar projetos. Projetos em planos pagos não são pausados por inatividade. Se o banco já estiver pausado, reative no painel do Supabase; esta rotina não usa a API de gerenciamento e não reativa projetos.

O GitHub pode atrasar execuções e desabilita agendamentos de repositórios públicos após 60 dias sem atividade no repositório. Consulte Actions periodicamente e reative o workflow se necessário. Não foram adicionados commits artificiais automáticos.

Fontes:
- https://supabase.com/docs/guides/platform/free-project-pausing
- https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule

O workflow foi preparado sem executar requisições contra o seu banco. Falhas transitórias têm até três tentativas; erros de configuração ou autorização falham sem insistir.
