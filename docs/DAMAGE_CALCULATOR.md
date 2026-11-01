# Calculadora de dano

Página pública: `/damage-calculator`, disponível no menu Explorar. Não exige login, Supabase ou o leitor de saves. Minha box continua desativada.

O motor é `@smogon/calc` 0.12.0, do [calculador oficial Pokémon Showdown/Smogon](https://github.com/smogon/damage-calc), sob licença MIT. A biblioteca fornece os catálogos e as regras das gerações III a IX usadas pela interface. A geração inicial é IX. Mudar a geração restaura o cenário inicial para não reutilizar dados incompatíveis.

## Ajustes

- Atacante: espécie/forma, nível, natureza, habilidade, item, status, HP atual, IVs, EVs e estágios.
- Defensor: sempre com HP máximo no nível selecionado (31 IVs, 252 EVs e 100% do HP). Os presets permanentes **MAX HP & DEF** e **MAX HP & SPDEF** maximizam também a defesa escolhida com 31 IVs, 252 EVs e natureza Bold ou Calm. Os 4 EVs restantes úteis vão para a outra defesa. Natureza, IVs, EVs e percentual de HP ficam fixos no defensor. Nível, espécie, habilidade, item, status, Tera e estágios continuam configuráveis. O preset é preservado ao mudar espécie/geração ou inverter os Pokémon, e é imposto também no motor de cálculo.
- IVs de 0 a 31, EVs de 0 a 252 por atributo, limite total de 510, nível de 1 a 100 e estágios de −6 a +6.
- Golpe, crítico, acertos de golpes múltiplos, clima, terreno, duplas e barreiras do defensor.
- Tipo Tera em regras da geração IX.
- Ativação manual de habilidades condicionais, como Flash Fire, e primeiro uso de Tera Stellar.

Atributos finais exibidos nos cards incluem nível, natureza, IVs e EVs; estágios e modificadores condicionais entram no cálculo do dano. O resultado informa intervalo absoluto, percentual do HP máximo, HP restante e chance de KO em um golpe quando disponível. A chance é condicionada ao golpe acertar; não é multiplicada pela precisão. Golpes de status sem dano não são apresentados como ataques comuns.

Não há hazards ou dano residual configuráveis nesta interface. Golpes de nocaute direto e golpes que dependem de dano recebido anteriormente exibem uma mensagem de indisponibilidade, pois exigem regras/entradas adicionais. Não é um simulador de turnos e não valida a legalidade da combinação de Pokémon/golpe/habilidade/item. Os catálogos refletem a versão fixada do motor. Alguns nomes e descrições de dados estão em inglês. As imagens são carregadas da PokéAPI; uma imagem ausente não bloqueia o cálculo.

Os campos numéricos atualizam os cálculos com valores válidos; ao sair do campo, entradas vazias ou fora da faixa são ajustadas aos limites. Spreads acima de 510 EVs exibem erro e não geram um resultado silenciosamente incorreto.

```powershell
node --test tests/damage-calculator.test.cjs
npm run build:web
```
