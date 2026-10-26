import React from "react";
import { ScrollViewStyleReset } from "expo-router/html";

export default function Html({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="theme-color" content="#172333" />
        <meta
          name="description"
          content="Explore Pokémon, tipos, evoluções, golpes e habilidades. Monte sua equipe e salve seus favoritos no Pokéatlas."
        />
        <ScrollViewStyleReset />
        <title>Pokéatlas — Sua próxima descoberta</title>
      </head>
      <body>{children}</body>
    </html>
  );
}
