import { Gamepad2, Gem, ScanLine, Sparkles } from "lucide-react-native";

export const dexTrackers = [
  {
    slug: "pokedex",
    title: "Pokedex Tracker",
    description: "Acompanhe sua coleção e o progresso da sua Pokédex.",
    Icon: ScanLine,
  },
  {
    slug: "shinydex",
    title: "Shinydex Tracker",
    description: "Organize sua coleção de Pokémon shiny.",
    Icon: Sparkles,
  },
  {
    slug: "gamesdex",
    title: "Gamesdex Tracker",
    description: "Acompanhe suas coleções por jogo Pokémon.",
    Icon: Gamepad2,
  },
  {
    slug: "megadex",
    title: "Megadex Tracker",
    description: "Organize sua coleção de Mega Evoluções.",
    Icon: Gem,
  },
] as const;
