# Contador Shiny

Execute a migração `migrations/202610280013_shiny_hunts.sql` inteira no SQL Editor do Supabase, após as migrações de contas (001) e Dex Tracker (003).

Acesse Seu espaço → Contador Shiny. Escolha o jogo e busque o Pokémon pelo nome ou número. Começar caça cria um registro separado com zero encontros. É possível manter várias caças e caçar o mesmo Pokémon novamente.

Use os botões − e +1 ou digite a contagem. Os encontros são salvos automaticamente após um segundo sem alterações. Aguarde a indicação Encontros salvos antes de sair da página. Falhas exibem mensagem e botão para tentar salvar novamente; nenhum sucesso é mostrado antes da confirmação do banco.

Achei! salva a contagem final, conclui a caça e marca a espécie na Shinydex na mesma transação. Não altera a Pokédex normal ou a Livingdex. O histórico mostra o jogo, o Pokémon, os encontros e a data. A Shinydex registra a espécie uma única vez, mesmo que várias caças encontrem o mesmo Pokémon.

Os dados ficam em `pokeatlas_private.shiny_hunts`, protegidos por RLS e RPC que valida a conta e o dispositivo. Cada conta só pode ler/alterar as próprias caças. A revisão do registro evita sobrescrever uma contagem alterada em outro dispositivo.

Não foram executados testes nem aplicada a query automaticamente.
