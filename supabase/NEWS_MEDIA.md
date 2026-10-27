# Fotos, vídeos e tradução das notícias

Execute `migrations/202610280012_news_media.sql` no SQL Editor, depois de 011. A chave existente continua válida.

O importador consulta o RSS e os metadados públicos da notícia para encontrar a imagem de capa do Nintendo Life e vídeos do YouTube. Mantém os endereços originais, sem baixar arquivos para o Supabase. Quando a fonte não disponibiliza mídia reconhecida, a postagem continua com texto. Vídeos abrem no YouTube ao tocar em Assistir vídeo, sem reprodução automática.

A próxima importação preenche mídia ausente das notícias ainda disponíveis no feed. Posts ocultados e textos editados não são sobrescritos.

A tradução do título e resumo acompanha o idioma selecionado no app (português, inglês, espanhol, japonês e chinês simplificado). Usa MyMemory para traduzir os textos públicos, com cache local por notícia/idioma. Não envia senha, e-mail nem dados de conta. O serviço gratuito tem limites; falhas preservam o original e a tela da notícia permite alternar com Ver original. Nenhuma chave adicional é necessária. Documentação: https://mymemory.translated.net/doc/spec.php.

O artigo completo e o áudio dos vídeos permanecem no idioma da fonte. A tradução automática pode conter erros.

Não foram executados testes nem aplicada a query ao banco.
