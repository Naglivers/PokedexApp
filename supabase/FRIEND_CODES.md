# Códigos de amizade

Execute inteiro `migrations/202610280015_friend_codes.sql` no SQL Editor, após a migração de contas 001.

Em Configurações do perfil → Códigos de amizade, preencha os campos opcionais. Os dados aparecem na nova aba Códigos de amizade do perfil público. O proprietário também pode abrir a edição por essa aba.

Campos: link HTTPS do perfil RetroAchievements, nickname PokéMMO, código do Nintendo Switch, Nintendo 3DS, Pokémon HOME e Pokémon Champions. Switch e 3DS são normalizados em grupos de quatro números; HOME é salvo em letras maiúsculas. Champions aceita o código como informado no jogo, sem impor formato não confirmado.

Deixar um campo vazio e salvar remove o valor do perfil público. Os campos vazios não aparecem para visitantes. Somente o link RetroAchievements é aberto como endereço externo; os códigos são exibidos como texto selecionável.

Dados em `pokeatlas_private.friend_codes`, com RLS e acesso direto revogado. A leitura pública retorna apenas os seis campos compartilhados, sem e-mail, senha, token ou ID interno. A escrita exige token da conta e identidade do dispositivo. Cada usuário altera somente seus próprios códigos.

Não foram executados testes nem aplicada a query automaticamente.
