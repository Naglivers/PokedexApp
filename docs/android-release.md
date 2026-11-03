# Atualizar o PokeAtlas na Play Store

O aplicativo correto e `@nagli/pokedex-atlas`, pacote `com.pokedex.atlas`.
Execute os comandos na pasta `PokedexApp`.

O perfil `production` em `eas.json` usa o ambiente EAS `production`, com:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

As duas variaveis publicas foram cadastradas no EAS. `.env.local` serve para
desenvolvimento e nao e enviado ao servidor porque esta no `.gitignore`.
O hook `eas-build-post-install` interrompe builds sem a configuracao correta.
Use apenas a chave publica; nunca service_role ou sb_secret no aplicativo.

Antes de gerar uma nova versao:

```powershell
eas.cmd env:list production
npm.cmd run supabase:check
eas.cmd build --platform android --profile production
```

O build gera um `.aab` com o mesmo pacote e incrementa o versionCode no EAS.
Envie o novo arquivo para uma nova versao no Play Console. Cadastrar variaveis
no EAS nao altera o aplicativo instalado: elas sao incorporadas ao novo build.
Teste primeiro na faixa de testes internos, verificando comunidade e login
em um aparelho Android.
