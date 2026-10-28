import type { MapPoint } from "../../store/mapPoints";
export const mapDimensions: Record<string, { width: number; height: number }> =
  {
    kanto: { width: 800, height: 553 },
    johto: { width: 1200, height: 812 },
    hoenn: { width: 578, height: 457 },
    sinnoh: { width: 1024, height: 724 },
    unova: { width: 1280, height: 837 },
    kalos: { width: 1032, height: 676 },
    alola: { width: 1280, height: 768 },
    galar: { width: 492, height: 822 },
    hisui: { width: 1000, height: 523 },
    paldea: { width: 3840, height: 2714 },
  };
// Centros dos locais identificados visualmente na arte RBY de assets/maps/kanto.png.
// Estes pontos só são usados se o local existir na resposta da região da PokéAPI.
export const initialMapPoints: Record<string, Record<string, MapPoint>> = {
  kanto: {
    "pallet-town": { x: 0.206, y: 0.732 },
    "viridian-city": { x: 0.181, y: 0.542 },
    "pewter-city": { x: 0.225, y: 0.208 },
    "cerulean-city": { x: 0.582, y: 0.188 },
    "saffron-city": { x: 0.588, y: 0.344 },
    "celadon-city": { x: 0.409, y: 0.335 },
    "vermilion-city": { x: 0.594, y: 0.537 },
    "lavender-town": { x: 0.806, y: 0.336 },
    "fuchsia-city": { x: 0.5, y: 0.817 },
    "cinnabar-island": { x: 0.261, y: 0.91 },
    "indigo-plateau": { x: 0.069, y: 0.15 },
  },
};
export const encounterMethodLabels: Record<string, string> = {
  walk: "Caminhando",
  surf: "Surfando",
  "old-rod": "Vara velha",
  "good-rod": "Vara boa",
  "super-rod": "Supervara",
  "rock-smash": "Quebra-pedra",
  headbutt: "Cabeçada",
  "headbutt-low": "Cabeçada (árvore baixa)",
  "headbutt-normal": "Cabeçada",
  "headbutt-high": "Cabeçada (árvore alta)",
  "dark-grass": "Grama escura",
  "grass-spots": "Grama em movimento",
  "cave-spots": "Nuvens de poeira",
  "bridge-spots": "Sombras na ponte",
  "super-rod-spots": "Pesca em água agitada",
  "surf-spots": "Água agitada",
  "yellow-flowers": "Flores amarelas",
  "purple-flowers": "Flores roxas",
  "red-flowers": "Flores vermelhas",
  "rough-terrain": "Terreno irregular",
  gift: "Presente",
  "gift-egg": "Ovo recebido",
  "only-one": "Encontro único",
};
